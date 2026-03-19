package one.mgu.storespigot;

import java.io.*;
import java.util.ArrayList;
import java.util.List;

public final class PluginMessageCodec {
    private PluginMessageCodec() {
    }

    public static SignedDecoded decodeSigned(byte[] data) throws IOException {
        DataInputStream in = new DataInputStream(new ByteArrayInputStream(data));

        long tsMillis = in.readLong();
        String nonce = in.readUTF();
        int unsignedLen = in.readInt();
        if (unsignedLen < 0 || unsignedLen > 1024 * 1024)
            throw new IOException("Invalid unsignedLen");
        byte[] unsigned = new byte[unsignedLen];
        in.readFully(unsigned);
        String sigHex = in.readUTF();

        // Now decode unsigned payload
        DataInputStream uin = new DataInputStream(new ByteArrayInputStream(unsigned));
        long ts2 = uin.readLong();
        String nonce2 = uin.readUTF();
        if (ts2 != tsMillis || !nonce2.equals(nonce))
            throw new IOException("Mismatched signed header");

        String orderId = uin.readUTF();
        String username = uin.readUTF();
        String productCode = uin.readUTF();
        String productType = uin.readUTF();
        String rank = uin.readUTF();
        double amount = uin.readDouble();
        String currency = uin.readUTF();

        int count = uin.readInt();
        List<String> commands = new ArrayList<>(Math.max(0, count));
        for (int i = 0; i < count; i++) {
            commands.add(uin.readUTF());
        }

        Decoded decoded = new Decoded(orderId, username, productCode, productType, rank, amount, currency, commands);
        return new SignedDecoded(tsMillis, nonce, unsigned, sigHex, decoded);
    }

    public static String bytesToHex(byte[] bytes) {
        StringBuilder sb = new StringBuilder(bytes.length * 2);
        for (byte b : bytes) {
            sb.append(Character.forDigit((b >>> 4) & 0xF, 16));
            sb.append(Character.forDigit(b & 0xF, 16));
        }
        return sb.toString();
    }

    public static final class SignedDecoded {
        public final long tsMillis;
        public final String nonce;
        public final byte[] unsigned;
        public final String sigHex;
        public final Decoded decoded;

        public SignedDecoded(long tsMillis, String nonce, byte[] unsigned, String sigHex, Decoded decoded) {
            this.tsMillis = tsMillis;
            this.nonce = nonce;
            this.unsigned = unsigned;
            this.sigHex = sigHex;
            this.decoded = decoded;
        }
    }

    public static final class Decoded {
        public final String orderId;
        public final String username;
        public final String productCode;
        public final String productType;
        public final String rank;
        public final double amount;
        public final String currency;
        public final List<String> commands;

        public Decoded(String orderId, String username, String productCode, String productType, String rank,
                double amount, String currency, List<String> commands) {
            this.orderId = orderId;
            this.username = username;
            this.productCode = productCode;
            this.productType = productType;
            this.rank = rank;
            this.amount = amount;
            this.currency = currency;
            this.commands = commands;
        }

        public String applyPlaceholders(String cmd) {
            return cmd
                    .replace("{orderId}", safe(orderId))
                    .replace("{username}", safe(username))
                    .replace("{productCode}", safe(productCode))
                    .replace("{productType}", safe(productType))
                    .replace("{rank}", safe(rank))
                    .replace("{amount}", String.valueOf(amount))
                    .replace("{currency}", safe(currency));
        }

        private static String safe(String s) {
            return s == null ? "" : s;
        }
    }
}
