import { supabase } from './supabase';
import type { Hazard, HazardType } from '../data';

// Generate a stable anonymous user id for this device/session
function makeUserId() {
  if (typeof window !== 'undefined' && window.localStorage) {
    const existing = window.localStorage.getItem('rg_user_id');
    if (existing) return existing;
    const id = 'u_' + Math.random().toString(36).slice(2, 10);
    window.localStorage.setItem('rg_user_id', id);
    return id;
  }
  return 'u_' + Math.random().toString(36).slice(2, 10);
}

export const USER_ID = makeUserId();

export interface DBHazard {
  id: string;
  type: HazardType;
  severity: 'low' | 'medium' | 'high';
  title: string | null;
  note: string | null;
  lat: number;
  lng: number;
  x: number | null;
  y: number | null;
  reporter_id: string | null;
  created_at: string;
  active: boolean;
}

export interface DBParked {
  id: string;
  user_id: string;
  lat: number;
  lng: number;
  x: number | null;
  y: number | null;
  registered_at: string;
  active: boolean;
}

export interface DBRating {
  id: string;
  mechanic_id: string;
  user_id: string;
  stars: number;
  review: string | null;
  created_at: string;
}

export interface DBPoi {
  id: string;
  kind: 'fuel' | 'hotel';
  name: string;
  brand: string | null;
  rating: number;
  price: string | null;
  x: number;
  y: number;
  fuel_reports?: { fuel_status: string; created_at: string }[];
}

export interface DBPart {
  id: string;
  name: string;
  category: string;
  price: string | null;
  rating: number;
  image: string | null;
  compatibility: string | null;
}

export interface DBShop {
  id: string;
  name: string;
  type: string | null;
  image: string | null;
  rating: number;
  reviews: number;
  phone: string | null;
  x: number | null;
  y: number | null;
}

/* ---------------- Hazards ---------------- */
// ... (existing hazards functions remain the same)

/* ---------------- POIs & Fuel Hub ---------------- */

export async function fetchPoisWithReports(): Promise<DBPoi[]> {
  const { data, error } = await supabase
    .from('pois')
    .select('*, fuel_reports(fuel_status, created_at)')
    .order('created_at', { ascending: true });
  
  if (error) {
    console.warn('fetchPoisWithReports', error.message);
    return [];
  }
  return data as DBPoi[];
}

export async function submitFuelReport(poiId: string, status: string) {
  const { error } = await supabase
    .from('fuel_reports')
    .insert({
      poi_id: poiId,
      fuel_status: status,
      reported_by: USER_ID
    });
  if (error) throw error;
}

/* ---------------- Spare Parts & Shops ---------------- */

export async function fetchSpareParts(): Promise<DBPart[]> {
  const { data, error } = await supabase
    .from('spare_parts')
    .select('*')
    .order('name', { ascending: true });
  if (error) {
    console.warn('fetchSpareParts', error.message);
    return [];
  }
  return data as DBPart[];
}

export async function fetchShops(): Promise<DBShop[]> {
  const { data, error } = await supabase
    .from('shops')
    .select('*')
    .order('rating', { ascending: false });
  if (error) {
    console.warn('fetchShops', error.message);
    return [];
  }
  return data as DBShop[];
}

/* ---------------- Parked Vehicles ---------------- */
// ... (existing parked functions remain)

/* ---------------- Chat ---------------- */
// ... (existing chat functions remain)

export async function fetchActiveHazards(): Promise<DBHazard[]> {
  const { data, error } = await supabase
    .from('hazards')
    .select('*')
    .eq('active', true)
    .order('created_at', { ascending: false });
  if (error) {
    console.warn('fetchActiveHazards error', error.message);
    return [];
  }
  return (data || []) as DBHazard[];
}

export function dbHazardToHazard(h: DBHazard): Hazard {
  return {
    id: h.id,
    type: h.type,
    severity: h.severity,
    title: h.title || 'Road hazard reported',
    x: h.x ?? 50,
    y: h.y ?? 50,
    distance: 0,
    reportedBy: h.reporter_id || undefined,
    reportedAt: h.created_at,
  };
}

export async function insertHazard(payload: {
  type: HazardType;
  severity: 'low' | 'medium' | 'high';
  title: string;
  note?: string;
  x: number;
  y: number;
  lat?: number;
  lng?: number;
}) {
  const { data, error } = await supabase
    .from('hazards')
    .insert({
      type: payload.type,
      severity: payload.severity,
      title: payload.title,
      note: payload.note || null,
      x: payload.x,
      y: payload.y,
      lat: payload.lat ?? 40.7128 + payload.y * 0.001,
      lng: payload.lng ?? -74.006 + payload.x * 0.001,
      reporter_id: USER_ID,
      active: true,
    })
    .select()
    .single();
  if (error) throw error;
  return data as DBHazard;
}

export async function deleteHazard(id: string) {
  const { error } = await supabase
    .from('hazards')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

export function subscribeHazards(onInsert: (h: DBHazard) => void, onDelete?: (id: string) => void) {
  const channel = supabase
    .channel('hazards-realtime')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'hazards' },
      (payload: any) => {
        onInsert(payload.new as DBHazard);
      }
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'hazards' },
      (payload: any) => {
        const row = payload.new as DBHazard;
        if (!row.active && onDelete) onDelete(row.id);
        else onInsert(row);
      }
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}

/* ---------------- Parked Vehicles ---------------- */

export async function fetchActiveParked(): Promise<DBParked[]> {
  const { data, error } = await supabase
    .from('parked_vehicles')
    .select('*')
    .eq('active', true);
  if (error) {
    console.warn('fetchActiveParked error', error.message);
    return [];
  }
  return (data || []) as DBParked[];
}

export async function registerParked(x: number, y: number, lat?: number, lng?: number) {
  // First deregister any previous active pin for this user
  await supabase
    .from('parked_vehicles')
    .update({ active: false })
    .eq('user_id', USER_ID)
    .eq('active', true);

  const { data, error } = await supabase
    .from('parked_vehicles')
    .insert({
      user_id: USER_ID,
      x,
      y,
      lat: lat ?? 40.7128 + y * 0.001,
      lng: lng ?? -74.006 + x * 0.001,
      active: true,
    })
    .select()
    .single();
  if (error) throw error;
  return data as DBParked;
}

export async function deregisterParked() {
  const { error } = await supabase
    .from('parked_vehicles')
    .update({ active: false })
    .eq('user_id', USER_ID)
    .eq('active', true);
  if (error) console.warn('deregisterParked', error.message);
}

export function subscribeParked(
  onInsert: (p: DBParked) => void,
  onUpdate: (p: DBParked) => void
) {
  const channel = supabase
    .channel('parked-realtime')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'parked_vehicles' },
      (payload: any) => onInsert(payload.new as DBParked)
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'parked_vehicles' },
      (payload: any) => onUpdate(payload.new as DBParked)
    )
    .subscribe();
  return () => supabase.removeChannel(channel);
}

/* ---------------- Mechanic Ratings ---------------- */

export async function fetchRatings(): Promise<DBRating[]> {
  const { data, error } = await supabase
    .from('mechanic_ratings')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) {
    console.warn('fetchRatings', error.message);
    return [];
  }
  return (data || []) as DBRating[];
}

export async function submitRating(mechanicId: string, stars: number, review?: string) {
  const { data, error } = await supabase
    .from('mechanic_ratings')
    .insert({
      mechanic_id: mechanicId,
      user_id: USER_ID,
      stars,
      review: review || null,
    })
    .select()
    .single();
  if (error) throw error;
  return data as DBRating;
}

/* ---------------- Chat (Supabase) ---------------- */

export interface ChatMessage {
  id: string;
  senderId: string;
  text: string;
  timestamp: string;
  isMe: boolean;
}

export async function fetchChatMessages(providerId: string): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('provider_id', providerId)
    .order('created_at', { ascending: true });

  if (error) {
    console.warn('fetchChatMessages', error.message);
    return [
      {
        id: 'm1',
        senderId: providerId,
        text: "Hello! How can I help you today?",
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        isMe: false
      }
    ];
  }

  return (data || []).map(m => ({
    id: m.id,
    senderId: m.sender_id,
    text: m.text,
    timestamp: m.created_at,
    isMe: m.sender_id === USER_ID
  }));
}

export async function sendChatMessage(providerId: string, text: string): Promise<ChatMessage> {
  const { data, error } = await supabase
    .from('chat_messages')
    .insert({
      provider_id: providerId,
      sender_id: USER_ID,
      text: text
    })
    .select()
    .single();

  if (error) throw error;

  return {
    id: data.id,
    senderId: data.sender_id,
    text: data.text,
    timestamp: data.created_at,
    isMe: true
  };
}

export function subscribeChat(providerId: string, onNewMessage: (msg: ChatMessage) => void) {
  const channel = supabase
    .channel(`chat-${providerId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `provider_id=eq.${providerId}` },
      (payload) => {
        const row = payload.new;
        onNewMessage({
          id: row.id,
          senderId: row.sender_id,
          text: row.text,
          timestamp: row.created_at,
          isMe: row.sender_id === USER_ID
        });
      }
    )
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}
