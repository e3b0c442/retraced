import * as express from "express";
import { logger } from "./logger";
import getEs from "./persistence/elasticsearch";

const app = express();
let lastNSQ: Date = new Date();

export function startHealthz() {
    // Needed for Kubernetes health checks
    app.get("/healthz", (req, res) => {
        res.status(200).send("");
    });

    // Needed for Kubernetes health checks
    app.get("/livez", async (req, res) => {
        const esHealth  = await getEs().cluster.health({ masterTimeout: "1s" });
        // TODO: use esHealth for something
        console.log(`${JSON.stringify(esHealth)}`);

        const currentTime: Date = new Date();
        // 1000 * 60 * 60 is one hour
        if (currentTime > new Date(lastNSQ.getTime() + (1000 * 60 * 60))) {
            res.status(500).send(`{"lastNSQ": ${lastNSQ.getTime()}, "status": "Unhealthy"}`);
        }
        res.status(200).send(`{"lastNSQ": ${lastNSQ.getTime()}}, "status": "Healthy"}`);
    });

    app.listen(3000, "0.0.0.0", () => {
        logger.info("Processor health checks listening on port 3000...");
    });
}

export function updateLastNSQ() {
    lastNSQ = new Date();
}
