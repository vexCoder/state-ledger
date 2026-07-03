import { Injectable } from '@nestjs/common';

const HOUR = 60 * 60 * 1000;

@Injectable()
export class TimeService {
  private offsetHours = 0;

  now(): Date {
    return new Date(Date.now() + this.offsetHours * HOUR);
  }

  state() {
    return {
      offsetHours: this.offsetHours,
      offsetDays: Math.round((this.offsetHours / 24) * 100) / 100,
      today: this.now().toISOString(),
    };
  }

  setOffsetHours(hours: number): void {
    this.offsetHours = Math.trunc(hours);
  }
}
