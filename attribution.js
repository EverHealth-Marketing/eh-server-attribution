
class ServerAttribution {
    constructor(serverUrl, fieldMap) {
        this.serverUrl = serverUrl;
        this.fieldMap = fieldMap;
        this.domain = this.extractDomain();

        this.handleAttributionCookie();
        this.sendAttributionToServer();
        this.autoFillForms();

        // observe dynamically added forms
        this.observeDynamicForms();
    }

    extractDomain() {
        const hostname = window.location.hostname;
        if (hostname === "localhost" || hostname === "127.0.0.1") return hostname;
        const parts = hostname.split(".");
        return parts.slice(-2).join(".");
    }

    readCookie(name) {
        const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
        if (match) {
            try { return JSON.parse(decodeURIComponent(match[ 2 ])); } catch { return {}; }
        }
        return {};
    }

    createCookie(name, value) {
        const expires = new Date(); expires.setFullYear(expires.getFullYear() + 10);
        document.cookie = `${name}=${encodeURIComponent(JSON.stringify(value))}; path=/; domain=${this.domain}; expires=${expires.toUTCString()};`;
    }

    handleAttributionCookie() {
        const params = new URLSearchParams(window.location.search);
        const cookieVal = {
            utm_campaign: params.get("utm_campaign") || "",
            utm_source: params.get("utm_source") || "",
            utm_medium: params.get("utm_medium") || "",
            utm_content: params.get("utm_content") || "",
            utm_term: params.get("utm_term") || "",
            utm_device: params.get("utm_device") || "",
            referrer: document.referrer.split("?")[ 0 ] || "",
            gclid: params.get("gclid") || "",
            lp: `${window.location.hostname}${window.location.pathname}`,
        };

        if (Object.keys(this.readCookie("__ecatft")).length === 0) this.createCookie("__ecatft", cookieVal);
        if (Object.keys(this.readCookie("__ecatlt")).length === 0) this.createCookie("__ecatlt", cookieVal);
    }

    sendAttributionToServer() {
        const payload = {
            firstTouch: this.readCookie("__ecatft"),
            lastTouch: this.readCookie("__ecatlt"),
            pageUrl: window.location.href
        };
        navigator.sendBeacon(this.serverUrl, JSON.stringify(payload));
    }

    autoFillForms() {
        const firstTouch = this.readCookie("__ecatft");
        const lastTouch = this.readCookie("__ecatlt");

        document.querySelectorAll("form").forEach((form) => {
            this.fillFormFields(form, firstTouch, lastTouch);
        });
    }

    fillFormFields(form, firstTouch, lastTouch) {
        Object.entries(this.fieldMap.first_touch).forEach(([ field, selector ]) => {
            const el = form.querySelector(selector);
            if (el) el.value = firstTouch[ field ] || "[blank]";
        });
        Object.entries(this.fieldMap.last_touch).forEach(([ field, selector ]) => {
            const el = form.querySelector(selector);
            if (el) el.value = lastTouch[ field ] || "[blank]";
        });
    }

    observeDynamicForms() {
        const observer = new MutationObserver((mutations) => {
            const firstTouch = this.readCookie("__ecatft");
            const lastTouch = this.readCookie("__ecatlt");
            mutations.forEach((m) => {
                m.addedNodes.forEach((node) => {
                    if (node.tagName === "FORM") {
                        this.fillFormFields(node, firstTouch, lastTouch);
                    } else if (node.querySelectorAll) {
                        node.querySelectorAll("form").forEach((f) => this.fillFormFields(f, firstTouch, lastTouch));
                    }
                });
            });
        });

        observer.observe(document.body, { childList: true, subtree: true });
    }
}

window.$EC = new ServerAttribution(serverGtmEndpoint, fieldMap);