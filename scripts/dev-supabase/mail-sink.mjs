// Minimal SMTP server: accepts every message and appends it to .dev-supabase/mail.log.
// Development only; lets GoTrue "send" verification and reset emails.
import net from "node:net";
import fs from "node:fs";
import path from "node:path";

const log = path.resolve(import.meta.dirname, "../../.dev-supabase/mail.log");

net
  .createServer((sock) => {
    let data = false;
    let buf = "";
    let msg = "";
    const say = (s) => sock.write(s + "\r\n");
    say("220 dev-mail ready");
    sock.on("data", (chunk) => {
      buf += chunk.toString("utf8");
      let i;
      while ((i = buf.indexOf("\r\n")) >= 0) {
        const line = buf.slice(0, i);
        buf = buf.slice(i + 2);
        if (data) {
          if (line === ".") {
            data = false;
            fs.appendFileSync(log, `\n===== ${new Date().toISOString()}\n${decode(msg)}\n`);
            msg = "";
            say("250 OK queued");
          } else msg += (line.startsWith("..") ? line.slice(1) : line) + "\n";
          continue;
        }
        const cmd = line.slice(0, 4).toUpperCase();
        if (cmd === "EHLO" || cmd === "HELO") say("250 dev-mail");
        else if (cmd === "DATA") { data = true; say("354 end with ."); }
        else if (cmd === "QUIT") { say("221 bye"); sock.end(); }
        else say("250 OK");
      }
    });
  })
  .listen(2500, () => console.log("dev mail sink on :2500"));

// Undo quoted-printable soft breaks so codes and links are readable in the log.
function decode(s) {
  return s.replace(/=\r?\n/g, "").replace(/=([0-9A-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
}
