package one.mgu.storeproxy;

import java.util.*;

/**
 * Minimal JSON parser for trusted, simple payloads.
 * Supports: objects, strings, numbers, booleans, null.
 * (Avoids bringing a JSON dependency into a provided-scope plugin jar.)
 */
public final class MiniJson {
    private final String s;
    private int i;

    private MiniJson(String s) {
        this.s = s;
    }

    public static Object parse(String s) {
        return new MiniJson(s).parseValue();
    }

    @SuppressWarnings("unchecked")
    public static Map<String, Object> parseObject(String s) {
        Object v = parse(s);
        if (!(v instanceof Map))
            throw new IllegalArgumentException("Expected JSON object");
        return (Map<String, Object>) v;
    }

    private Object parseValue() {
        skipWs();
        if (i >= s.length())
            throw new IllegalArgumentException("Unexpected end");
        char c = s.charAt(i);
        if (c == '{')
            return parseObject();
        if (c == '[')
            return parseArray();
        if (c == '"')
            return parseString();
        if (c == '-' || (c >= '0' && c <= '9'))
            return parseNumber();
        if (s.startsWith("true", i)) {
            i += 4;
            return Boolean.TRUE;
        }
        if (s.startsWith("false", i)) {
            i += 5;
            return Boolean.FALSE;
        }
        if (s.startsWith("null", i)) {
            i += 4;
            return null;
        }
        throw new IllegalArgumentException("Unexpected token at " + i);
    }

    private Map<String, Object> parseObject() {
        expect('{');
        Map<String, Object> m = new LinkedHashMap<>();
        skipWs();
        if (peek('}')) {
            i++;
            return m;
        }
        while (true) {
            skipWs();
            String k = parseString();
            skipWs();
            expect(':');
            Object v = parseValue();
            m.put(k, v);
            skipWs();
            if (peek('}')) {
                i++;
                break;
            }
            expect(',');
        }
        return m;
    }

    private List<Object> parseArray() {
        expect('[');
        List<Object> out = new ArrayList<>();
        skipWs();
        if (peek(']')) {
            i++;
            return out;
        }

        while (true) {
            Object v = parseValue();
            out.add(v);
            skipWs();
            if (peek(']')) {
                i++;
                break;
            }
            expect(',');
        }
        return out;
    }

    private String parseString() {
        expect('"');
        StringBuilder sb = new StringBuilder();
        while (i < s.length()) {
            char c = s.charAt(i++);
            if (c == '"')
                break;
            if (c == '\\') {
                if (i >= s.length())
                    throw new IllegalArgumentException("Bad escape");
                char e = s.charAt(i++);
                switch (e) {
                    case '"':
                        sb.append('"');
                        break;
                    case '\\':
                        sb.append('\\');
                        break;
                    case '/':
                        sb.append('/');
                        break;
                    case 'b':
                        sb.append('\b');
                        break;
                    case 'f':
                        sb.append('\f');
                        break;
                    case 'n':
                        sb.append('\n');
                        break;
                    case 'r':
                        sb.append('\r');
                        break;
                    case 't':
                        sb.append('\t');
                        break;
                    case 'u':
                        if (i + 4 > s.length())
                            throw new IllegalArgumentException("Bad unicode");
                        String hex = s.substring(i, i + 4);
                        i += 4;
                        sb.append((char) Integer.parseInt(hex, 16));
                        break;
                    default:
                        throw new IllegalArgumentException("Bad escape: " + e);
                }
            } else {
                sb.append(c);
            }
        }
        return sb.toString();
    }

    private Number parseNumber() {
        int start = i;
        if (s.charAt(i) == '-')
            i++;
        while (i < s.length() && Character.isDigit(s.charAt(i)))
            i++;
        if (i < s.length() && s.charAt(i) == '.') {
            i++;
            while (i < s.length() && Character.isDigit(s.charAt(i)))
                i++;
        }
        if (i < s.length() && (s.charAt(i) == 'e' || s.charAt(i) == 'E')) {
            i++;
            if (i < s.length() && (s.charAt(i) == '+' || s.charAt(i) == '-'))
                i++;
            while (i < s.length() && Character.isDigit(s.charAt(i)))
                i++;
        }
        String n = s.substring(start, i);
        if (n.contains(".") || n.contains("e") || n.contains("E"))
            return Double.parseDouble(n);
        try {
            return Long.parseLong(n);
        } catch (NumberFormatException e) {
            return Double.parseDouble(n);
        }
    }

    private void skipWs() {
        while (i < s.length()) {
            char c = s.charAt(i);
            if (c == ' ' || c == '\n' || c == '\r' || c == '\t')
                i++;
            else
                break;
        }
    }

    private boolean peek(char c) {
        return i < s.length() && s.charAt(i) == c;
    }

    private void expect(char c) {
        if (i >= s.length() || s.charAt(i) != c) {
            throw new IllegalArgumentException("Expected '" + c + "' at " + i);
        }
        i++;
    }
}
