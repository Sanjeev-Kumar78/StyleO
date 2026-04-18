/**
 * imageQueue.ts
 *
 * A concurrency-limited queue for image fetch requests.
 * Prevents flooding the backend with 20+ simultaneous blob requests
 * when the wardrobe grid renders many cards at once.
 *
 * Max concurrent fetches is kept deliberately low (4–6) per workers so the
 * FastAPI/uvicorn backend is never overwhelmed.
 */

type Task<T> = () => Promise<T>;

class ConcurrentQueue {
  private readonly concurrency: number;
  private running = 0;
  private queue: Array<() => void> = [];

  constructor(concurrency = 5) {
    this.concurrency = concurrency;
  }

  // Enqueue a task and return a Promise that resolves/rejects with its result.
  enqueue<T>(task: Task<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const run = () => {
        this.running++;
        task()
          .then(resolve)
          .catch(reject)
          .finally(() => {
            this.running--;
            this.dequeue();
          });
      };

      if (this.running < this.concurrency) {
        run();
      } else {
        this.queue.push(run);
      }
    });
  }

  private dequeue() {
    const next = this.queue.shift();
    if (next) next();
  }
}

// Shared singleton — all image hooks share the same rate limiter.
const imageQueue = new ConcurrentQueue(10);

export default imageQueue;
