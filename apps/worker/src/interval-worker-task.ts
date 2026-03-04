export class IntervalWorkerTask {
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly intervalMs: number,
    private readonly task: () => Promise<void>,
  ) {}

  start(): void {
    if (this.timer) {
      return;
    }

    this.timer = setInterval(() => {
      void this.task();
    }, this.intervalMs);
  }

  stop(): void {
    if (!this.timer) {
      return;
    }

    clearInterval(this.timer);
    this.timer = null;
  }
}
