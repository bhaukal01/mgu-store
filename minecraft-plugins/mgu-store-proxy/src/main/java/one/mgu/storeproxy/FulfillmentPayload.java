package one.mgu.storeproxy;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public final class FulfillmentPayload {
    public final String orderId;
    public final String username;
    public final String productCode;
    public final String productType;
    public final String rank;
    public final double amount;
    public final String currency;
    public final List<ActionSpec> actions;

    public static final class ActionSpec {
        public final String server;
        public final List<String> commands;

        public ActionSpec(String server, List<String> commands) {
            this.server = server;
            this.commands = commands == null ? Collections.emptyList() : commands;
        }
    }

    public FulfillmentPayload(
            String orderId,
            String username,
            String productCode,
            String productType,
            String rank,
            double amount,
            String currency,
            List<ActionSpec> actions) {
        this.orderId = orderId;
        this.username = username;
        this.productCode = productCode;
        this.productType = productType;
        this.rank = rank;
        this.amount = amount;
        this.currency = currency;
        this.actions = actions == null ? Collections.emptyList()
                : Collections.unmodifiableList(new ArrayList<ActionSpec>(actions));
    }
}
