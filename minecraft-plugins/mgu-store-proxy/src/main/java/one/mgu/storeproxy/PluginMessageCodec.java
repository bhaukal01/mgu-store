package one.mgu.storeproxy;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.List;

public final class PluginMessageCodec {
    private PluginMessageCodec() {
    }

    public static byte[] encodeSigned(String keyB64, long tsMillis, String nonce, FulfillmentPayload payload,
            List<String> commands) {
        try {
            byte[] unsigned = encodeUnsigned(tsMillis, nonce, payload, commands);
            String sig = Hmac.hmacSha256Hex(keyB64, bytesToHex(unsigned));

            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            DataOutputStream out = new DataOutputStream(baos);
            out.writeLong(tsMillis);
            out.writeUTF(nonce);
            out.writeInt(unsigned.length);
            out.write(unsigned);
            out.writeUTF(sig);
            out.flush();
            return baos.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    private static byte[] encodeUnsigned(long tsMillis, String nonce, FulfillmentPayload payload, List<String> commands)
            throws IOException {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        DataOutputStream out = new DataOutputStream(baos);

        // include ts/nonce inside the signed bytes too (defense-in-depth)
        out.writeLong(tsMillis);
        out.writeUTF(nonce);

        out.writeUTF(payload.orderId);
        out.writeUTF(payload.username);
        out.writeUTF(payload.productCode == null ? "" : payload.productCode);
        out.writeUTF(payload.productType == null ? "" : payload.productType);
        out.writeUTF(payload.rank == null ? "" : payload.rank);
        out.writeDouble(payload.amount);
        out.writeUTF(payload.currency == null ? "" : payload.currency);

        out.writeInt(commands.size());
        for (String cmd : commands) {
            out.writeUTF(cmd);
        }

        out.flush();
        return baos.toByteArray();
    }

    private static String bytesToHex(byte[] bytes) {
        StringBuilder sb = new StringBuilder(bytes.length * 2);
        for (byte b : bytes) {
            sb.append(Character.forDigit((b >>> 4) & 0xF, 16));
            sb.append(Character.forDigit(b & 0xF, 16));
        }
        return sb.toString();
    }

    public static byte[] encode(FulfillmentPayload payload, List<String> commands) {
        try {
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            DataOutputStream out = new DataOutputStream(baos);

            out.writeUTF(payload.orderId);
            out.writeUTF(payload.username);
            out.writeUTF(payload.productCode == null ? "" : payload.productCode);
            out.writeUTF(payload.productType == null ? "" : payload.productType);
            out.writeUTF(payload.rank == null ? "" : payload.rank);
            out.writeDouble(payload.amount);
            out.writeUTF(payload.currency == null ? "" : payload.currency);

            out.writeInt(commands.size());
            for (String cmd : commands) {
                out.writeUTF(cmd);
            }

            out.flush();
            return baos.toByteArray();
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
    }

    public static String applyPlaceholders(String cmd, FulfillmentPayload p) {
        return cmd
                .replace("{orderId}", safe(p.orderId))
                .replace("{username}", safe(p.username))
                .replace("{productCode}", safe(p.productCode))
                .replace("{productType}", safe(p.productType))
                .replace("{rank}", safe(p.rank))
                .replace("{amount}", String.valueOf(p.amount))
                .replace("{currency}", safe(p.currency));
    }

    private static String safe(String s) {
        return s == null ? "" : s;
    }
}
