export class EventLog {
  constructor(maxLength = 1000) {
    this.maxLength = maxLength;
    this.events = [];
  }

  push(event) {
    this.events.push({ ...event, timestamp: Date.now() });
    if (this.events.length > this.maxLength) {
      this.events.shift();
    }
  }

  replay({ since } = {}) {
    if (!since) {
      return [...this.events];
    }
    return this.events.filter((event) => event.timestamp >= since);
  }
}
