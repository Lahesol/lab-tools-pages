const DATABASE_NAME = "keithley2400-rram-console";
const DATABASE_VERSION = 1;
const STORE_NAME = "runs";

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export class RunStore {
  constructor() {
    this.db = null;
    this.writeQueue = Promise.resolve();
  }

  async open() {
    if (!("indexedDB" in window)) throw new Error("이 브라우저는 IndexedDB를 제공하지 않습니다.");
    this.db = await new Promise((resolve, reject) => {
      const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
          store.createIndex("startedAt", "startedAt");
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error("IndexedDB 열기 실패"));
      request.onblocked = () => reject(new Error("IndexedDB가 다른 탭에서 잠겨 있습니다."));
    });
    return this;
  }

  transaction(mode, operation) {
    if (!this.db) throw new Error("저장소가 초기화되지 않았습니다.");
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(STORE_NAME, mode);
      const store = transaction.objectStore(STORE_NAME);
      let value;
      operation(store, (result) => { value = result; });
      transaction.oncomplete = () => resolve(value);
      transaction.onerror = () => reject(transaction.error ?? new Error("IndexedDB transaction 실패"));
      transaction.onabort = () => reject(transaction.error ?? new Error("IndexedDB transaction 중단"));
    });
  }

  enqueue(action) {
    this.writeQueue = this.writeQueue.then(action, action);
    return this.writeQueue;
  }

  async put(run) {
    const record = clone(run);
    return this.enqueue(() => this.transaction("readwrite", (store) => {
      store.put(record);
    }));
  }

  async get(id) {
    return this.transaction("readonly", (store, setValue) => {
      const request = store.get(id);
      request.onsuccess = () => setValue(request.result ? clone(request.result) : null);
    });
  }

  async list() {
    return this.transaction("readonly", (store, setValue) => {
      const request = store.getAll();
      request.onsuccess = () => setValue((request.result ?? []).map(clone).sort((a, b) => String(b.startedAt).localeCompare(String(a.startedAt))));
    });
  }

  async appendRawEvent(id, event) {
    return this.enqueue(async () => {
      const run = await this.get(id);
      if (!run) throw new Error(`저장할 run ${id}를 찾을 수 없습니다.`);
      run.rawEvents = run.rawEvents ?? [];
      run.rawEvents.push(clone(event));
      await this.transaction("readwrite", (store) => { store.put(run); });
    });
  }

  async update(id, mutate) {
    return this.enqueue(async () => {
      const run = await this.get(id);
      if (!run) throw new Error(`갱신할 run ${id}를 찾을 수 없습니다.`);
      const result = mutate(run) ?? run;
      await this.transaction("readwrite", (store) => { store.put(clone(result)); });
      return result;
    });
  }
}

export function downloadText(filename, text, mimeType) {
  const blob = new Blob([text], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function runToCsv(run) {
  const rows = run.derivedRows ?? [];
  const quote = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  const header = ["run_id", "kind", "synthetic", "point", "voltage_V", "current_A", "resistance_ohm", "state", "warnings"];
  const body = rows.map((row) => [
    run.id, run.kind, Boolean(run.synthetic), row.index, row.voltageV, row.currentA,
    row.resistanceOhm ?? "", row.state ?? "", (row.warnings ?? []).join(" | "),
  ].map(quote).join(","));
  return `\uFEFF${header.join(",")}\n${body.join("\n")}\n`;
}
