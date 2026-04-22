import { createCommand } from "./utils";

export type Args = {
  path: string;
};

type Output = number[];

const readLocalFileBytesCommand = createCommand<Args, Output>(
  "read_local_file_bytes",
);

export async function readLocalFileBytes(path: string): Promise<Uint8Array> {
  const bytes = await readLocalFileBytesCommand({ path });
  return Uint8Array.from(bytes);
}
