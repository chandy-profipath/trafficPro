import * as Speech from 'expo-speech';

class SafetyVoiceManager {
  private recentlySpoken: Map<string, number> = new Map();
  private readonly COOLDOWN = 120000; // 2 minutes cooldown per unique hazard

  public async warnHazard(hazardType: string, hazardTitle: string, distance: number) {
    const key = `${hazardType}_${hazardTitle}`;
    const now = Date.now();
    
    if (this.recentlySpoken.has(key) && now - this.recentlySpoken.get(key)! < this.COOLDOWN) {
      return; // Skip if already spoken recently
    }

    this.recentlySpoken.set(key, now);

    const distanceText = distance < 100 ? 'nearby' : `${Math.round(distance)} meters ahead`;
    const message = `Caution: ${this.formatType(hazardType)} reported ${distanceText}. ${hazardTitle}`;

    Speech.stop(); // Interruption for high priority safety alert
    Speech.speak(message, {
      pitch: 1.0,
      rate: 1.0,
      language: 'en-US',
    });
  }

  private formatType(type: string): string {
    return type.replace('_', ' ');
  }

  public stopAll() {
    Speech.stop();
  }
}

export const SafetyVoice = new SafetyVoiceManager();
