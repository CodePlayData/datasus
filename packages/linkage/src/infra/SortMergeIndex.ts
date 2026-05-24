import { IndexStrategy } from "../interface/IndexStrategy";

export interface SortMergeIndexOptions {
    chunkSize?: number;
    onChunk?: () => void;
}

/**
 * In-memory index that groups records by blocking key and tracks chunk processing.
 * Designed as a stepping stone to on-disk sort-merge: cohort records are buffered
 * in chunks per key, and `onChunk` fires each time a chunk is filled during indexing.
 *
 * Memory stays bounded per-chunk; for production use with DbcRecordProvider the
 * cohort streams from file and only the current chunk lives in RAM.
 */
export class SortMergeIndex implements IndexStrategy {
    private store: Array<{ key: string; value: unknown }> = [];
    private readonly chunkSize: number;
    private onChunk: (() => void) | undefined;
    private chunkBuffer: Array<{ key: string; value: unknown }> = [];
    private sorted = false;

    constructor(options?: SortMergeIndexOptions) {
        this.chunkSize = options?.chunkSize ?? 1000;
        this.onChunk = options?.onChunk;
    }

    async set(key: string, value: unknown): Promise<void> {
        this.chunkBuffer.push({ key, value });

        if (this.chunkBuffer.length >= this.chunkSize) {
            this.store.push(...this.chunkBuffer);
            this.chunkBuffer = [];
            this.onChunk?.();
        }
    }

    private ensureSorted() {
        if (this.sorted) return;
        if (this.chunkBuffer.length > 0) {
            this.store.push(...this.chunkBuffer);
            this.chunkBuffer = [];
        }
        this.store.sort((a, b) => a.key < b.key ? -1 : a.key > b.key ? 1 : 0);
        this.sorted = true;
    }

    async get(key: string): Promise<unknown[]> {
        this.ensureSorted();
        const result: unknown[] = [];
        for (const entry of this.store) {
            if (entry.key === key) {
                result.push(entry.value);
            }
        }
        return result;
    }

    async has(key: string): Promise<boolean> {
        this.ensureSorted();
        return this.store.some(e => e.key === key);
    }
}
