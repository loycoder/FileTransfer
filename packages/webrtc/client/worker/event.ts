import type { MessageType } from "../../types/worker";
import { HEADER_KEY, MESSAGE_TYPE } from "../../types/worker";

export class WorkerEvent {
  public static channel: MessageChannel | null = null;
  public static worker: ServiceWorkerRegistration | null = null;
  public static writer: Map<string, WritableStreamDefaultWriter<Uint8Array>> = new Map();

  public static async register(): Promise<ServiceWorkerRegistration> {
    try {
      const serviceWorker = await navigator.serviceWorker.getRegistration("./");
      if (serviceWorker) {
        WorkerEvent.worker = serviceWorker;
        return Promise.resolve(serviceWorker);
      }
      const worker = await navigator.serviceWorker.register(
        process.env.PUBLIC_PATH + "worker.js?" + process.env.RANDOM_ID,
        { scope: "./" }
      );
      WorkerEvent.worker = worker;
      return worker;
    } catch (error) {
      console.error("Service Worker Register Error", error);
      return Promise.reject(error);
    }
  }

  public static isTrustEnv() {
    return location.protocol === "https:" || location.hostname === "localhost";
  }

  public static start(fileId: string, fileName: string, fileSize: number, fileTotal: number) {
    if (!WorkerEvent.channel) {
      WorkerEvent.channel = new MessageChannel();
      WorkerEvent.channel.port1.onmessage = event => {
        console.log("WorkerEvent", event.data);
      };
      WorkerEvent.worker?.active?.postMessage({ type: MESSAGE_TYPE.INIT_CHANNEL }, [
        WorkerEvent.channel.port2,
      ]);
    }
    // 在 TransformStream 不可用的情况下 https://caniuse.com/?search=TransformStream
    // 需要在 Service Worker 中使用 ReadableStream 写入数据 fa28d9d757ddeda9c93645362
    // 通过 controller.enqueue 将 ArrayBuffer 数据写入即可
    // 直接使用 ReadableStream 需要主动处理 BackPressure
    // 而 TransformStream 实际上内部实现了背压的自动处理机制
    const ts = new TransformStream();
    WorkerEvent.channel.port1.postMessage(
      <MessageType>{
        key: MESSAGE_TYPE.TRANSFER_START,
        id: fileId,
        readable: ts.readable,
      },
      [ts.readable]
    );
    WorkerEvent.writer.set(fileId, ts.writable.getWriter());
    const newFileName = encodeURIComponent(fileName)
      .replace(/['()]/g, escape)
      .replace(/\*/g, "%2A");
    const src =
      `/${fileId}` +
      `?${HEADER_KEY.FILE_ID}=${fileId}` +
      `&${HEADER_KEY.FILE_SIZE}=${fileSize}` +
      `&${HEADER_KEY.FILE_TOTAL}=${fileTotal}` +
      `&${HEADER_KEY.FILE_NAME}=${newFileName}`;
    const iframe = document.createElement("iframe");
    iframe.hidden = true;
    iframe.src = src;
    iframe.id = fileId;
    document.body.appendChild(iframe);
  }

  public static async post(fileId: string, data: ArrayBuffer) {
    const ts = WorkerEvent.writer.get(fileId);
    if (!ts) return void 0;
    // 感知 BackPressure 需要主动 await ready
    await ts.ready;
    return ts.write(new Uint8Array(data));
  }

  public static close(fileId: string) {
    const iframe = document.getElementById(fileId);
    iframe && iframe.remove();
    WorkerEvent.channel?.port1.postMessage(<MessageType>{
      key: MESSAGE_TYPE.TRANSFER_CLOSE,
      id: fileId,
    });
    const ts = WorkerEvent.writer.get(fileId);
    ts?.close();
    WorkerEvent.writer.delete(fileId);
  }
}
