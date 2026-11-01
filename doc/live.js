const __vite__mapDeps = (i, m=__vite__mapDeps, d=(m.f || (m.f = ["./GSDevTools-D2EfMgoZ.js", "./matrix-F56iWJ6C.js", "./ShirtIcon-BPw30iBN.js", "./_plugin-vue_export-helper-DlAUqK2U.js", "./vendor-vue-Drq_Q470.js", "./DefaultZone-lZF561nd.js", "./vendor-signalr-Dbd_ma0m.js", "./vendor-gsap-CXLx4Xb1.js", "./vendor-fontawesome-Dd0jG53T.js", "./DefaultZone-Cln19fWN.css", "./ZoneField-WGQVCjGm.js", "./ZoneField-CS9fq3Xw.css", "./createHockeyQueueJob-CCtfHQ6S.js", "./HockeyStore-BjXTNY1f.js", "./SportTeamStats-4TblZdUn.js", "./QueueBridgeStore-BKEycL_o.js", "./scoreAnimator-BMkcJkVI.js", "./ZoneField-DwAYwhm7.js", "./useRelationClass-D-lBwFMT.js", "./useTeamInfo-C0K1XNlb.js", "./ZoneField-DBHhA0ub.css", "./TeeShirtIcon-Iwt10elY.js", "./HockeyTimerBarSwitcher-YQqOma4f.js", "./createTennisQueueJob-rdLUqumr.js", "./courtAnchor-BxCzIGfe.js", "./ZoneField-cyvGWQrR.js", "./useQueueRelease-YYCtCBF2.js", "./Flip-Cc0qx5_P.js", "./ZoneField-Cub2C_X9.css", "./ZoneField-DinsU-JR.js", "./ZoneField-CyD5SRVH.css", "./ManIcon-CifNw2Rw.js", "./TopCenterInfo-BX5xt1RG.js", "./TopCenterInfo-B7F1zmAH.css", "./F1Data-3FF7rTbK.js", "./ZoneField-Ba_jWUZi.js", "./MarqueeText.common-CMLWqTyR.js", "./ZoneField-BvY7JGrP.css", "./F1TopPanel-B_Eqd4Sd.js", "./F1TopPanel-DPLyfqCM.css", "./ZoneField-ClbfLPWQ.js", "./ZoneField-B6L0VisL.css", "./CSData-6UfKA2dR.js", "./all-DR60_1Pc.js", "./paths-CgpjCInu.js", "./ZoneField-CcHOMOqb.js", "./ZoneField-CD_HKQVm.css", "./TeamSideLogo-Ck49banW.js", "./createBasketBallQueueJob-MlfIrIBd.js", "./BasketBallStore-QmqjaKUD.js", "./ZoneField-CIoAs5rn.js", "./ZoneField-CglvPUy5.css", "./BasketballTimerBar-DPrQyn12.js", "./BasketballTimerBar-B0QS1Tu3.css", "./BasketTeeShirtIcon-B7Gl3Ju8.js", "./createVolleyballQueueJob-DQzq024F.js", "./ZoneField-CMUsw3G8.js", "./ZoneField-BTHm3B_k.css", "./VolleyBallTeeShirtIcon-B8V18PpZ.js", "./SportZone-ohUWYF3U.js", "./SportZone-DRHVTjXK.css"]))) => i.map(i => d[i]);
import {u as et, V as tt, M as st, L as it} from "./vendor-signalr-Dbd_ma0m.js";
import {a as b, b as I, c as E, u as Ye, e as at, t as nt, f as rt, g as ot, j as ct, r as lt, d as ut, k as ht, o as mt, l as ft, m as St, n as gt, p as pt} from "./vendor-vue-Drq_Q470.js";
import {g as ze} from "./vendor-gsap-CXLx4Xb1.js";
import {l as dt, f as vt, a as _t, b as Tt, c as yt, d as bt, e as wt, g as Pt, h as Dt, i as kt, j as Et, k as It, m as Ct, n as At, o as Mt, p as Lt, q as Rt, r as Ot, s as xt, F as Ft} from "./vendor-fontawesome-Dd0jG53T.js";
(function() {
        const t = document.createElement("link").relList;
        if (t && t.supports && t.supports("modulepreload"))
            return;
        for (const a of document.querySelectorAll('link[rel="modulepreload"]'))
            s(a);
        new MutationObserver(a => {
                for (const n of a)
                    if (n.type === "childList")
                        for (const r of n.addedNodes)
                            r.tagName === "LINK" && r.rel === "modulepreload" && s(r)
            }
        ).observe(document, {
            childList: !0,
            subtree: !0
        });
        function i(a) {
            const n = {};
            return a.integrity && (n.integrity = a.integrity),
            a.referrerPolicy && (n.referrerPolicy = a.referrerPolicy),
                a.crossOrigin === "use-credentials" ? n.credentials = "include" : a.crossOrigin === "anonymous" ? n.credentials = "omit" : n.credentials = "same-origin",
                n
        }
        function s(a) {
            if (a.ep)
                return;
            a.ep = !0;
            const n = i(a);
            fetch(a.href, n)
        }
    }
)();
const Bt = "modulepreload"
    , Gt = function(e, t) {
    return new URL(e,t).href
}
    , _e = {}
    , p = function(t, i, s) {
    let a = Promise.resolve();
    if (i && i.length > 0) {
        const r = document.getElementsByTagName("link")
            , o = document.querySelector("meta[property=csp-nonce]")
            , c = (o == null ? void 0 : o.nonce) || (o == null ? void 0 : o.getAttribute("nonce"));
        a = Promise.allSettled(i.map(l => {
                if (l = Gt(l, s),
                l in _e)
                    return;
                _e[l] = !0;
                const u = l.endsWith(".css")
                    , v = u ? '[rel="stylesheet"]' : "";
                if (!!s)
                    for (let S = r.length - 1; S >= 0; S--) {
                        const f = r[S];
                        if (f.href === l && (!u || f.rel === "stylesheet"))
                            return
                    }
                else if (document.querySelector(`link[href="${l}"]${v}`))
                    return;
                const m = document.createElement("link");
                if (m.rel = u ? "stylesheet" : Bt,
                u || (m.as = "script"),
                    m.crossOrigin = "",
                    m.href = l,
                c && m.setAttribute("nonce", c),
                    document.head.appendChild(m),
                    u)
                    return new Promise( (S, f) => {
                            m.addEventListener("load", S),
                                m.addEventListener("error", () => f(new Error(`Unable to preload CSS for ${l}`)))
                        }
                    )
            }
        ))
    }
    function n(r) {
        const o = new Event("vite:preloadError",{
            cancelable: !0
        });
        if (o.payload = r,
            window.dispatchEvent(o),
            !o.defaultPrevented)
            throw r
    }
    return a.then(r => {
            for (const o of r || [])
                o.status === "rejected" && n(o.reason);
            return t().catch(n)
        }
    )
}
    , Te = "#23A1FC"
    , ye = "#ABE250"
    , ee = b("DataTeams", {
    state: () => ({
        Player1: "#23A1FC",
        Player2: "ABE250",
        Color1: Te,
        Color2: ye,
        SC1: "",
        SC2: "",
        S1_1: "",
        S2_1: "",
        S3_1: "",
        S4_1: "",
        S5_1: "",
        S6_1: "",
        S7_1: "",
        S8_1: "",
        ScoreSet_1: 0,
        PI_1: "",
        S1_2: "",
        S2_2: "",
        S3_2: "",
        S4_2: "",
        S5_2: "",
        S6_2: "",
        S7_2: "",
        S8_2: "",
        ScoreSet_2: 0,
        PI_2: ""
    }),
    getters: {},
    actions: {
        async setData(e) {
            this.$state = {
                ...this.$state,
                ...e
            },
            this.Color1.trim().toLowerCase() === this.Color2.trim().toLowerCase() && (this.Color1 = Te,
                this.Color2 = ye)
        }
    }
})
    , Vt = {
    event_team: "",
    event_text: "",
    event_team_num: 0,
    active_event: 0,
    event_num: 0,
    dataload: !1,
    activeZone: !1,
    showScoreBar: !1
}
    , ue = {
    Player1_ru: "",
    Player2_ru: "",
    Player1_orig: "",
    Player2_orig: "",
    Results: [{
        IC: "",
        ID: "",
        SP: "",
        TI: "",
        TM: ""
    }],
    EventLocations: [{
        ID: "",
        IT: "",
        LE: "",
        OR: "",
        PD: "",
        ST: "",
        TE: "",
        TL: "",
        XY: "0,0"
    }],
    Events: [{
        Block: "",
        Order: "",
        Run: "",
        Type: "",
        Value: ""
    }],
    ID: "",
    Champ: "",
    Video3d: "",
    SportId: 0,
    Rotate: "",
    XY: "",
    ED: "",
    MD: "",
    ML: "",
    PG: "",
    Player1: "",
    Player2: "",
    S1: "",
    S2: "",
    S3: "",
    S4: "",
    S5: "",
    S6: "",
    SS: "",
    SubSS: "",
    TD: "",
    TM: "",
    TS: "",
    TT: "",
    TU: "",
    VC: "",
    XT: "",
    TeamKits: [{
        AD: "",
        KC: "",
        KI: "",
        PI: "",
        S1: "",
        S2: "",
        S3: "",
        S4: "",
        S5: "",
        S6: "",
        S7: "",
        S8: "",
        SC: "",
        ScoreSet: 0,
        TC: ""
    }, {
        AD: "",
        KC: "",
        KI: "",
        PI: "",
        S1: "",
        S2: "",
        S3: "",
        S4: "",
        S5: "",
        S6: "",
        S7: "",
        S8: "",
        SC: "",
        ScoreSet: 0,
        TC: ""
    }],
    DeltaMilliseconds: 0,
    ServerTime: "",
    serverDate: new Date,
    lastDateTimer: new Date,
    t: 0
}
    , z = b("LocaleData", {
    state: () => ({
        text: {},
        supportedLocales: ["ru", "de", "en"]
    }),
    getters: {
        localeUrl() {
            const e = Q().Lang ?? "";
            return this.supportedLocales.includes(e) ? `locale/${e}.json` : "locale/en.json"
        }
    },
    actions: {
        async loadLocale() {
            const t = await (await fetch(this.localeUrl)).json();
            return this.text = t,
                !0
        }
    }
})
    , Nt = e => e ? e.GameId ? e.Sport ? !0 : (console.log("Invalid config: Sport not set"),
    !1) : (console.log("Invalid config: GameId not set"),
    !1) : !1
    , Xt = e => {
    let t;
    try {
        t = JSON.parse(e, (i, s) => typeof s == "string" && isFinite(Number(s)) ? +parseInt(s) : s)
    } catch {
        return
    }
    return t
}
    , Q = b("ConfigZone", {
    state: () => ({
        GameId: 0,
        Sport: 0,
        Lang: "en",
        PathLoad: "",
        IsMobileWeb: !1,
        IsMobileApp: !1,
        Token: "",
        debugFilePath: "",
        debugDelayMs: 500,
        debugUseRealTiming: !1,
        isSaveLog: !1,
        rotate: ""
    }),
    getters: {
        hasCustomEmbedConfig() {
            return !!this.customEmbedConfig
        },
        customEmbedConfig: () => "",
        isDebug: () => !1
    },
    actions: {
        async setData(e) {
            return e.Lang && (e.Lang = e.Lang.toLowerCase()),
                this.$state = {
                    ...this.$state,
                    ...e
                },
                this.$state
        },
        async initialize(e) {
            var i;
            const t = e ?? this.customEmbedConfig;
            if (t) {
                const s = Xt(t);
                if (!Nt(s))
                    return !1;
                s.Lang = (i = s.Lang) == null ? void 0 : i.toLowerCase(),
                    this.$patch(s)
            } else
                return !1;
            return await z().loadLocale(),
                !0
        }
    }
});
function ae(e) {
    return new Date(parseInt(e.slice(0, 4)),parseInt(e.slice(4, 6)) - 1,parseInt(e.slice(6, 8)),parseInt(e.slice(8, 10)),parseInt(e.slice(10, 12)),parseInt(e.slice(12, 14)))
}
function be(e) {
    return e < 10 ? "0" + e.toString() : e.toString()
}
const P = b("BaseStore", {
    state: () => ({
        Event: ue,
        Info: Vt
    }),
    getters: {
        getTimeObj(e) {
            const t = e.Event;
            if (t.TM == null)
                return {
                    m: 0,
                    s: 0
                };
            const i = (parseInt(t.TM) || 0) * 6e4 + (parseInt(t.TS) || 0) * 1e3;
            let s = 0;
            t.serverDate != null && t.TT == "1" && t.TU && (s = t.serverDate.valueOf() - ae(t.TU).valueOf());
            const a = Math.max(i + s, 0)
                , n = a % 6e4;
            return {
                m: Math.round((a - n) / 6e4),
                s: Math.round(n / 1e3)
            }
        },
        getTimeGameString() {
            const e = this.getTimeObj;
            return be(e.m) + ":" + be(e.s)
        }
    },
    actions: {
        async setData(e, t=!1) {
            if (e.Player1 && e.Player2 && (await this.setPlayers(e),
                this.Info.dataload = !0),
            e.TeamKits && !t && await this.setTeam(e),
            e.ServerTime != "" && e.DeltaMilliseconds && this.setServerTime(e.ServerTime, e.DeltaMilliseconds),
            e.VC && e.VC != "" && e.VC != "0" && !t) {
                const i = Number(e.VC);
                i > 1e4 && this.parseTeamEvent(i)
            }
            if (e.XY) {
                const i = e.XY.split(",").map(Number)
                    , s = i[0]
                    , a = i[1];
                s < 1.1 && a < 1.1 && s >= 0 && a >= 0 || (e.XY = "")
            }
            return e.XY === "" && (e.XY = this.Event.XY),
                this.Event = {
                    ...this.Event,
                    ...e
                },
                !0
        },
        parseTeamEvent(e) {
            this.Info.event_team_num = Number(String(e).substring(0, 1));
            const t = Number(String(e).substring(1));
            this.Info.event_team = this.Info.event_team_num == 1 ? this.Event.Player1 : this.Event.Player2,
                this.Info.event_num = t
        },
        async setPlayers(e) {
            const t = Q()
                , i = ee()
                , s = {};
            e.Player1 && (s.Player1 = t.Lang == "ru" && e.Player1_ru || e.Player1),
            e.Player2 && (s.Player2 = t.Lang == "ru" && e.Player2_ru || e.Player2),
                await i.setData(s)
        },
        async setTeam(e) {
            var s;
            const t = ee()
                , i = {};
            if ((s = e.TeamKits) != null && s.length) {
                const a = e.TeamKits[0]
                    , n = e.TeamKits[1];
                a.TC && (i.Color1 = a.TC),
                n.TC && (i.Color2 = n.TC),
                a.SC && (i.SC1 = a.SC.trim()),
                n.SC && (i.SC2 = n.SC.trim()),
                a.S1 && (i.S1_1 = a.S1),
                a.S2 && (i.S2_1 = a.S2),
                a.S3 && (i.S3_1 = a.S3),
                a.S4 && (i.S4_1 = a.S4),
                a.S5 && (i.S5_1 = a.S5),
                a.S6 && (i.S6_1 = a.S6),
                a.S7 && (i.S7_1 = a.S7),
                a.S8 && (i.S8_1 = a.S8),
                a.ScoreSet && (i.ScoreSet_1 = a.ScoreSet),
                a.PI && (i.PI_1 = a.PI),
                n.S1 && (i.S1_2 = n.S1),
                n.S2 && (i.S2_2 = n.S2),
                n.S3 && (i.S3_2 = n.S3),
                n.S4 && (i.S4_2 = n.S4),
                n.S5 && (i.S5_2 = n.S5),
                n.S6 && (i.S6_2 = n.S6),
                n.S7 && (i.S7_2 = n.S7),
                n.S8 && (i.S8_2 = n.S8),
                n.ScoreSet && (i.ScoreSet_2 = n.ScoreSet),
                n.PI && (i.PI_2 = n.PI)
            }
            await t.setData(i)
        },
        async setDataInfo(e) {
            return this.Info = {
                ...this.Info,
                ...e
            },
                this.Info
        },
        setServerTime(e, t) {
            if (!e)
                return;
            this.Event.ServerTime = e,
                this.Event.serverDate = new Date(ae(e).valueOf() + t);
            const i = new Date
                , s = Date.UTC(i.getUTCFullYear(), i.getUTCMonth(), i.getUTCDate(), i.getUTCHours(), i.getUTCMinutes(), i.getUTCSeconds());
            this.Event.lastDateTimer = new Date(s),
            this.Event.t > 0 || (this.Event.t = setInterval( () => {
                    this.onTimer()
                }
                , 1e3))
        },
        updateTimerValues(e, t, i, s) {
            s && (this.Event.TT = s),
            e && (this.Event.TM = e),
            i && (this.Event.TU = ae(i).valueOf().toString()),
            t && (this.Event.TS = t)
        },
        onTimer() {
            this.Event.TT != "0" && (this.Event.serverDate = new Date(this.Event.serverDate.valueOf() + (new Date().valueOf() - this.Event.lastDateTimer.valueOf())),
                this.Event.lastDateTimer = new Date)
        }
    }
})
    , $t = b("DataQueue", {
    state: () => ({
        EventsQueue: [],
        showAnimation: !1,
        isRunning: !1,
        handlers: [],
        playZone: !0
    }),
    getters: {
        hasEvents: e => e.EventsQueue.length > 0,
        count: e => e.EventsQueue.length
    },
    actions: {
        addEvent(e) {
            this.EventsQueue.push(e)
        },
        getEvent() {
            return this.EventsQueue.shift()
        },
        addHandler(e) {
            this.handlers.some(t => t === e) || this.handlers.push(e)
        },
        removeHandler(e) {
            this.handlers = this.handlers.filter(t => t !== e)
        },
        async handleQueue() {
            if (this.showAnimation && this.count > 10 && (this.showAnimation = !1),
                !(this.isRunning || !this.hasEvents || this.showAnimation || !this.playZone)) {
                this.isRunning = !0;
                try {
                    for (; this.hasEvents && !(this.showAnimation || !this.playZone); ) {
                        const e = this.getEvent();
                        if (e)
                            for (const t of this.handlers)
                                await t(e)
                    }
                } finally {
                    this.isRunning = !1
                }
            }
        },
        runQueue() {
            this.$subscribe(this.handleQueue, {
                detached: !1
            }),
            this.hasEvents && this.handleQueue()
        },
        async setShowAnimation(e) {
            this.showAnimation = e
        }
    }
})
    , Yt = b("DataState", {
    state: () => ({
        EventLocations: []
    }),
    getters: {
        count: e => e.EventLocations.length
    },
    actions: {
        addData(e) {
            this.checker(this.EventLocations, e) || this.EventLocations.push(e)
        },
        checker(e, t) {
            return e.filter(i => i.ID == t.ID).length > 0
        }
    }
})
    , H = b("zoneConfig", {
    state: () => ({
        zoneSize: {
            X: 0,
            Y: 0,
            W: 0,
            H: 0
        },
        state: 0,
        activeState: !1,
        relation: 1,
        V3D: !1,
        timeLine: !1,
        stateButton: [],
        wrapperW: 0,
        wrapperH: 0,
        fieldMount: !1,
        showTimer: !1,
        showTeamScore: !1,
        showBottomPanel: !1,
        showSubScore: !1,
        topPanelMount: !1
    }),
    actions: {
        async setStateButton(e) {
            return this.stateButton = e,
                this.stateButton
        },
        async setData(e) {
            return this.$state = {
                ...this.$state,
                ...e
            },
                this.$state
        }
    }
});
let Z = null
    , $ = !1;
const we = async (e, t, i=500, s=!1) => {
    if ($) {
        console.warn("connectDebug: уже запущен, остановите предыдущий вызовом stopDebug()");
        return
    }
    let a = [];
    try {
        console.log(`connectDebug: загрузка ${e}`);
        const o = await fetch(e);
        if (!o.ok)
            throw new Error(`HTTP ${o.status}: ${o.statusText}`);
        a = await o.json()
    } catch (o) {
        console.error("connectDebug: ошибка загрузки файла:", o);
        return
    }
    if (!Array.isArray(a) || a.length === 0) {
        console.warn("connectDebug: файл пуст или неверный формат");
        return
    }
    console.log(`connectDebug: загружено ${a.length} событий`),
        $ = !0;
    let n = 0;
    const r = () => {
            var l;
            if (!$ || n >= a.length) {
                $ = !1,
                    console.log("connectDebug: все события обработаны");
                return
            }
            const o = a[n]
                , c = o.payload;
            if (c && (console.log(`connectDebug [${n + 1}/${a.length}]:`, c.VC || "data"),
                t(c)),
                n++,
            n < a.length) {
                let u = i;
                if (s && o.ts && ((l = a[n]) != null && l.ts)) {
                    const v = new Date(o.ts).getTime()
                        , h = new Date(a[n].ts).getTime();
                    u = Math.max(h - v, 50)
                }
                Z = setTimeout(r, u)
            } else
                $ = !1,
                    console.log("connectDebug: завершено")
        }
    ;
    r()
}
    , zt = () => {
    Z && (clearTimeout(Z),
        Z = null),
        $ = !1,
        console.log("connectDebug: остановлен")
}
    , Ht = "app-gsdevtools";
let W = null
    , j = null;
async function Wt() {
    return j || (j = (await p( () => import("./GSDevTools-D2EfMgoZ.js"), __vite__mapDeps([0, 1]), import.meta.url)).GSDevTools,
        ze.registerPlugin(j)),
        j
}
async function le(e, t={}) {
    const i = await Wt();
    return he(),
        W = i.create({
            id: Ht,
            globalSync: e == null,
            ...e != null ? {
                animation: e
            } : {},
            ...t
        }),
        W
}
function he() {
    W && (W.kill(),
        W = null)
}
async function Pe(e) {
    return W ? (he(),
        !1) : (await le(e),
        !0)
}
function Kt() {
    if (typeof window > "u")
        return;
    const e = window;
    e.__gsdevInit || (e.__gsdevInit = !0,
        e.gsdev = t => le(t),
        e.gsdevOff = () => he(),
        e.gsdevToggle = t => Pe(t),
        window.addEventListener("keydown", t => {
                t.ctrlKey && t.shiftKey && (t.key === "g" || t.key === "G") && (t.preventDefault(),
                    Pe())
            }
        ),
    new URLSearchParams(window.location.search).has("gsdev") && le())
}
function qt(e) {
    const t = new WeakSet;
    return JSON.stringify(e, (i, s) => {
            if (typeof s == "bigint")
                return s.toString();
            if (s instanceof Error)
                return {
                    name: s.name,
                    message: s.message,
                    stack: s.stack
                };
            if (typeof s == "object" && s !== null) {
                if (t.has(s))
                    return "[Circular]";
                t.add(s)
            }
            return s
        }
    )
}
function De(e) {
    if (!e)
        return [];
    try {
        const t = JSON.parse(e);
        return Array.isArray(t) ? t : []
    } catch {
        return []
    }
}
function Qt(e) {
    const t = e == null ? void 0 : e.maxEntries
        , i = (e == null ? void 0 : e.storagePrefix) ?? "__arrlog__:"
        , s = u => `${i}${u}`;
    function a(u) {
        return `${s(u)}:seq`
    }
    function n(u) {
        const v = a(u)
            , m = Number(localStorage.getItem(v) ?? "0") + 1;
        return localStorage.setItem(v, String(m)),
            m
    }
    async function r(u, v, h) {
        const m = s(u)
            , S = De(localStorage.getItem(m))
            , f = {
            seq: n(u),
            ts: new Date().toISOString(),
            payload: v,
            ...h ? {
                meta: h
            } : {}
        };
        S.push(f);
        const T = S.length > t ? S.slice(S.length - t) : S;
        localStorage.setItem(m, qt(T))
    }
    async function o(u) {
        const v = s(u);
        return De(localStorage.getItem(v))
    }
    async function c(u) {
        localStorage.removeItem(s(u)),
            localStorage.removeItem(a(u))
    }
    async function l(u) {
        const v = await o(u)
            , h = JSON.stringify(v, null, 2)
            , m = new Blob([h],{
            type: "application/json;charset=utf-8"
        })
            , S = URL.createObjectURL(m)
            , f = document.createElement("a");
        f.href = S,
            f.download = u.endsWith(".json") ? u : `${u}.json`,
            document.body.appendChild(f),
            f.click(),
            f.remove(),
            URL.revokeObjectURL(S)
    }
    return {
        log: r,
        read: o,
        clear: c,
        download: l
    }
}
const ke = e => e < 10 ? "0" + e : "" + e
    , Jt = I( () => p( () => import("./ShirtIcon-BPw30iBN.js"), __vite__mapDeps([2, 3, 4]), import.meta.url))
    , He = {
    customTopPanel: null,
    timerBarComponent: null,
    timerComponent: null,
    getTeamIcon: () => Jt,
    formatScore: e => (e == null ? void 0 : e.replace("-", ":")) || "0:0",
    useTeamColors: !1,
    show3DToggle: !1,
    getTimerValue: e => {
        const t = e.getTimeObj
            , i = t.s === 60 ? 0 : t.s;
        return ke(t.m) + ":" + ke(i)
    }
    ,
    getSubScoreValue: () => "",
    onOpenStats: null,
    isStatsAvailable: null
}
    , jt = {
    ...He,
    sportId: 0,
    name: "Unknown",
    dataStrategy: "none",
    zoneComponent: () => p( () => import("./DefaultZone-lZF561nd.js"), __vite__mapDeps([5, 4, 3, 6, 7, 8, 9]), import.meta.url),
    zoneFlags: {
        showTimer: !1,
        showTeamScore: !1,
        showBottomPanel: !1,
        showSubScore: !1
    },
    bgColor: "#fff"
}
    , We = new Map;
function A(e) {
    We.set(e.sportId, e)
}
function q(e) {
    return We.get(e) ?? jt
}
function Ks() {
    const e = Q();
    return E( () => q(e.Sport))
}
function Ut(e) {
    const t = q(e);
    return {
        customTopPanel: t.customTopPanel,
        timerBarComponent: t.timerBarComponent,
        timerComponent: t.timerComponent,
        getTeamIcon: t.getTeamIcon,
        formatScore: t.formatScore,
        useTeamColors: t.useTeamColors,
        show3DToggle: t.show3DToggle,
        getTimerValue: t.getTimerValue,
        getTimerPrefix: t.getTimerPrefix,
        getSubScoreValue: t.getSubScoreValue,
        showTimerIcon: t.showTimerIcon,
        teamIconSize: t.teamIconSize,
        teamInfoMargin: t.teamInfoMargin,
        scoreFontSize: t.scoreFontSize,
        onOpenStats: t.onOpenStats,
        isStatsAvailable: t.isStatsAvailable
    }
}
function qs() {
    const e = Q();
    return E( () => Ut(e.Sport))
}
function M(e) {
    return {
        ...He,
        ...e
    }
}
const Ee = b("TrackBallStore", {
    state: () => ({
        points: [],
        lines: []
    }),
    getters: {},
    actions: {
        addPoint(e) {
            const t = H()
                , i = E( () => t.zoneSize.W)
                , s = E( () => t.zoneSize.H)
                , a = e.split(",").map(Number)
                , n = {
                x: a[0] * i.value,
                y: a[1] * s.value
            };
            if (this.points.unshift(n),
                this.points[1]) {
                const r = {
                    x1: this.points[1].x,
                    y1: this.points[1].y,
                    x2: n.x,
                    y2: n.y
                };
                this.addLine(r)
            }
        },
        addLine(e) {
            this.lines.unshift(e)
        },
        delPoint() {
            this.points.pop(),
            this.lines.length > 0 && this.lines.pop()
        },
        claerData() {
            this.lines.length = 0,
                this.points.length = 0
        }
    }
});
function ne(e, t) {
    const i = e - .5 + Math.random() * (t - e + 1);
    return Math.round(i)
}
function Zt(e) {
    var t;
    if ((t = e.ID) != null && t.includes("1003") && !e.XY) {
        const i = e.TE == "1" ? ne(84, 86) / 100 : ne(17, 16) / 100
            , s = ne(40, 60) / 100;
        e.XY = i.toString() + "," + s.toString()
    }
}
const Ie = b("FootballData", {
    state: () => ({
        buttons: [],
        animChange: 0,
        showAttack: 0,
        active_ball: !1,
        activePenalty: !1,
        trianglVisible: !1,
        oldTeam: 0,
        oldBXY: {
            x: 0,
            y: 0
        },
        showBall: !1,
        ballX: 0,
        ballY: 0,
        ballH: 0,
        ballW: 0,
        activeEvent: !1,
        attacX: 0,
        targetKef: 2,
        targetX: 2
    }),
    getters: {},
    actions: {
        async setButtons() {
            const e = z()
                , t = H()
                , i = E( () => e.text)
                , s = [{
                state: 1003,
                icon: "fa-regular fa-futbol",
                text: i.value.Goals
            }, {
                state: 1010,
                icon: "fas fa-exclamation",
                text: i.value.Free_Kicks
            }, {
                state: 1011,
                icon: "fas fa-crosshairs",
                text: i.value.On_Target
            }, {
                state: 1234,
                icon: "fa-regular fa-flag",
                text: i.value.Offsides
            }];
            await t.setStateButton(s)
        },
        processEvent(e) {
            const t = P()
                , s = z().text;
            if (e.VC && e.VC != "" && e.VC != "0") {
                const a = Number(e.VC);
                if (a > 1e4) {
                    const n = this.checkEvent(a);
                    t.setDataInfo({
                        event_text: n
                    })
                } else
                    switch (a) {
                        case 2e3:
                            this.activePenalty = !1,
                                e.XY = "0.5,0.5",
                                t.setDataInfo({
                                    active_event: 1,
                                    activeZone: !0,
                                    event_num: a
                                }),
                                this.activeEvent(s.endofmatch);
                            break;
                        case 1014:
                            e.XY = "0.5,0.5",
                                this.activeEvent(s.kickOff);
                            break;
                        case 1015:
                            this.activeEvent(s.halftime);
                            break;
                        case 1016:
                            e.XY = "0.5,0.5",
                                this.activeEvent(s.secondhalf);
                            break;
                        case 1017:
                            this.activeEvent(s.fulltime);
                            break;
                        case 1018:
                            this.activeEvent(s.kickOffExtraTime);
                            break;
                        case 1019:
                            this.activeEvent(s.extraTimeHT);
                            break;
                        case 1020:
                            this.activeEvent(s.kickOffExtraTime2ndHalf);
                            break;
                        case 1021:
                            this.activeEvent(s.endOfExtraTime);
                            break;
                        case 1022:
                            this.activePenalty = !0,
                                this.active_ball = !1,
                                t.setDataInfo({
                                    active_event: 0
                                }),
                                this.activeEvent(s.penaltyshootout);
                            break;
                        case 1023:
                            this.activeEvent(s.penaltyMiss);
                            break;
                        case 1024:
                            break;
                        case 1025:
                            this.activeEvent(s.injury);
                            break;
                        case 1026:
                            this.activeEvent(s.injuryTime);
                            break;
                        case 1330:
                        case 1333:
                            this.activeEvent(s.var);
                            break
                    }
            }
            if (e.XY) {
                const a = e.XY.split(",").map(Number)
                    , n = a[0]
                    , r = a[1];
                n < 1.1 && r < 1.1 && n >= 0 && r >= 0 && (this.active_ball = !0)
            }
            if (e.XY && (t.Info.event_num === 1004 || t.Info.event_num === 1239 || t.Info.event_num === 3211)) {
                const a = e.XY.split(",").map(Number)
                    , n = a[0]
                    , r = a[1];
                e.XY = `${Math.round(n)},${Math.round(r)}`
            }
        },
        activeEvent(e) {
            const t = Ee()
                , i = P();
            t.$reset(),
                this.animChange = 0,
                i.Event.PG = "",
                i.setDataInfo({
                    active_event: 1,
                    event_team_num: 0,
                    event_team: "",
                    event_text: e
                })
        },
        checkEvent(e) {
            var v, h, m, S;
            const t = P();
            H();
            const i = Ee()
                , a = z().text;
            let n = 0
                , r = ""
                , o = 0
                , c = Number(String(e).substring(0, 1));
            n = Number(String(e).substring(1));
            let l = c == 1 ? t.Event.Player1 : t.Event.Player2
                , u = n;
            switch (this.animChange = 0,
                this.trianglVisible = !1,
                this.showAttack = 1,
                this.oldTeam = t.Info.event_team_num,
            (t.Info.active_event == 1 || this.trianglVisible) && (i.$reset(),
                this.oldTeam = c),
                n) {
                case 8:
                    this.activePenalty = !0,
                        this.active_ball = !1,
                        r = a.conversionScored;
                    break;
                case 9:
                    this.activePenalty = !0,
                        this.active_ball = !1,
                        r = a.penaltymissed;
                    break;
                case 21:
                    this.activePenalty = !0,
                        this.active_ball = !1,
                        r = a.Penalty;
                    break;
                case 1e3:
                case 1300:
                    this.targetKef = 3,
                        o = 0,
                        this.trianglVisible = !1,
                        r = a.danger,
                    (!this.active_ball || t.Event.XY == "") && (c == 1 ? t.Event.XY = "0.8,0.5" : t.Event.XY = "0.2,0.5");
                    break;
                case 1001:
                case 1301:
                    this.targetKef = 2,
                        o = 0,
                        r = a.attack,
                    (!this.active_ball || t.Event.XY == "") && (c == 1 ? t.Event.XY = "0.6,0.5" : t.Event.XY = "0.4,0.5");
                    break;
                case 1002:
                case 1302:
                    this.targetKef = 1.5,
                        o = 0,
                        r = a.safe,
                    (!this.active_ball || t.Event.XY == "") && (c == 1 ? t.Event.XY = "0.25,0.5" : t.Event.XY = "0.75,0.5");
                    break;
                case 1003:
                    i.$reset(),
                        r = a.goal,
                        this.resetAnim(1),
                        o = 1,
                    (!this.active_ball || t.Event.XY == "") && (c == 1 ? t.Event.XY = "1,0.5" : t.Event.XY = "0,0.5");
                    break;
                case 1004:
                case 1239:
                case 3211:
                    if (i.$reset(),
                        o = 0,
                        this.showAttack = 0,
                        this.trianglVisible = !0,
                        r = a.corner,
                    !this.active_ball || t.Event.XY == "")
                        c == 1 ? t.Event.XY = "1,1" : t.Event.XY = "0,1";
                    else {
                        const f = ((v = t.Event.XY) == null ? void 0 : v.split(",").map(Number)) || [0, 0]
                            , T = f[0]
                            , D = f[1];
                        t.Event.XY = `${Math.round(T)},${Math.round(D)}`,
                            Math.round(T) > 0 ? c = 1 : c = 2
                    }
                    break;
                case 1005:
                    o = 1,
                        r = a.yellowcard;
                    break;
                case 1006:
                    o = 1,
                        r = a.redcard;
                    break;
                case 1007:
                    o = 0,
                        this.showAttack = 0,
                        this.trianglVisible = !0,
                        r = a.goalkick,
                        c == 1 ? t.Event.XY = "0.04,0.38" : t.Event.XY = "0.96,0.38",
                        i.$reset();
                    break;
                case 1008:
                    o = 1,
                        r = a.shotongoal;
                    break;
                case 1009:
                    i.$reset(),
                        o = 0,
                        this.showAttack = 0,
                        this.trianglVisible = !0,
                        r = a.dfreekick,
                    this.active_ball || (c == 1 ? t.Event.XY = "0.75,0.5" : t.Event.XY = "0.25,0.5");
                    break;
                case 1010:
                    if (i.$reset(),
                        o = 0,
                        this.showAttack = 0,
                        this.trianglVisible = !0,
                        !this.active_ball)
                        r = a.freekick,
                            c == 1 ? t.Event.XY = "0.25,0.5" : t.Event.XY = "0.75,0.5";
                    else {
                        const f = ((h = t.Event.XY) == null ? void 0 : h.split(",").map(Number)[0]) || 0;
                        c == 1 ? r = f < .8 ? a.freekick : a.dfreekick : r = f > .2 ? a.freekick : a.dfreekick
                    }
                    break;
                case 1011:
                    o = 1,
                        r = a.shotongoal;
                    break;
                case 1012:
                    o = 1,
                        r = a.shotoffgoal;
                    break;
                case 1013:
                case 1238:
                    o = 1,
                        r = a.substitution;
                    break;
                case 1014:
                    o = 0,
                        this.showAttack = 0,
                        r = a.kickOff,
                        t.Event.XY = "0.5,0.5";
                    break;
                case 1016:
                    o = 0,
                        r = a.secondhalf;
                    break;
                case 1018:
                    o = 0,
                        this.animChange = 0,
                        r = a.startExtraTime1;
                    break;
                case 1020:
                    o = 0,
                        this.animChange = 0,
                        r = a.kickOff2ndHalf;
                    break;
                case 1021:
                case 1022:
                    o = 0,
                        this.activePenalty = !0,
                        this.active_ball = !1,
                        t.Event.PG = "",
                        r = a.Penalty;
                    break;
                case 1023:
                    this.showAttack = 0,
                        r = a.penaltyMiss;
                    break;
                case 1024:
                    if (o = 0,
                        this.showAttack = 0,
                        this.trianglVisible = !0,
                        i.$reset(),
                        r = a.throw,
                    !this.trianglVisible || t.Event.XY == "")
                        c == 1 ? t.Event.XY = "0.75,1" : t.Event.XY = "0.25,1";
                    else {
                        const f = ((m = t.Event.XY) == null ? void 0 : m.split(",").map(Number)[0]) || 0;
                        let T = ((S = t.Event.XY) == null ? void 0 : S.split(",").map(Number)[1]) || 0;
                        T < .5 ? T = 0 : T = 1;
                        const D = f + "," + T;
                        t.Event.XY = D
                    }
                    break;
                case 1025:
                    o = 1,
                        this.showAttack = 0,
                        r = a.injury;
                    break;
                case 1026:
                    o = 1,
                        l = "",
                        c = 0,
                        r = a.injuryTime;
                    break;
                case 1234:
                    o = 1,
                        r = a.offside;
                    break;
                case 1236:
                    i.$reset(),
                        o = 0,
                        this.showAttack = 0,
                        this.trianglVisible = !0,
                        r = a.freekick,
                    this.active_ball || (c == 1 ? t.Event.XY = "0.75,0.5" : t.Event.XY = "0.25,0.5");
                    break;
                case 1325:
                case 1331:
                case 1333:
                    o = 1,
                        l = "",
                        c = 0,
                        r = a.var;
                    break;
                case 1332:
                    o = 1,
                        l = "",
                        c = 0,
                        r = a.var;
                    break;
                case 1237:
                    o = 1,
                        r = a.throw;
                    break;
                case 1242:
                    o = 1,
                        r = a.DisallowedGoal;
                    break;
                default:
                    o = 0,
                        this.showAttack = 0,
                        r = "";
                    break
            }
            return t.setDataInfo({
                event_num: u,
                active_event: o,
                event_team_num: c,
                event_team: l
            }),
                r
        },
        async setAttack() {
            const e = P()
                , t = H()
                , i = E( () => e.Info.event_team_num)
                , s = E( () => e.Info.event_num)
                , a = E( () => {
                    var n;
                    return ((n = e.Event.XY) == null ? void 0 : n.split(",").map(Number)) || [.5, .5]
                }
            );
            i.value == 1 ? (this.targetX = this.ballX + this.ballW * this.targetKef,
                this.attacX = this.ballX + this.ballW,
            s.value == 1e3 && a.value[0] > .9 && (this.targetX = t.zoneSize.W - this.ballW,
                this.attacX = t.zoneSize.W - this.ballW * 4)) : (this.targetX = this.ballX - this.ballW * this.targetKef,
                this.attacX = this.ballX - this.ballW,
            s.value == 1e3 && a.value[0] < .1 && (this.targetX = this.ballW,
                this.attacX = this.ballW * 4))
        },
        chageAnim(e) {
            this.animChange = e
        },
        changeActivEvent(e) {
            P().setDataInfo({
                active_event: e
            })
        },
        resetAnim(e) {
            P().setDataInfo({
                active_event: e == 0 ? 1 : 0
            }),
                setTimeout(this.changeActivEvent, 500, e)
        }
    }
});
A(M({
    sportId: 1,
    name: "Football",
    dataStrategy: "generic",
    onAfterBaseSetData: e => {
        Ie().processEvent(e)
    }
    ,
    preprocessEventLocation: Zt,
    zoneComponent: () => p( () => import("./ZoneField-WGQVCjGm.js"), __vite__mapDeps([10, 4, 7, 3, 6, 8, 11]), import.meta.url),
    zoneFlags: {
        showTimer: !0,
        showTeamScore: !1,
        showBottomPanel: !0,
        showSubScore: !1
    },
    bgColor: "#537a1e",
    onOpenStats: async () => {
        await Ie().setButtons(),
            await H().setData({
                activeState: !0
            })
    }
}));
const es = e => !e || e === "" || e === "0" ? null : e.length === 5 ? Number(e.substring(1)) : Number(e)
    , ts = ["5 ON 5", "4 ON 4", "3 ON 3"]
    , ss = new Set([1271, 1274, 1275, 1276, 1280, 1281, 1282, 1284, 1287, 1288, 2e3]);
let V = null
    , N = null;
function O() {
    return {
        minutes: 0,
        seconds: 0,
        active: !1
    }
}
function Ce(e) {
    if (!e || e === "null" || e === "" || e === "00:00")
        return O();
    const t = e.split(":")
        , i = parseInt(t[0]) || 0
        , s = t.length > 1 && parseInt(t[1]) || 0;
    return i === 0 && s === 0 ? O() : {
        minutes: i,
        seconds: s,
        active: !0
    }
}
function te(e) {
    return e < 10 ? "0" + e : "" + e
}
function Ae(e) {
    return te(e.minutes) + ":" + te(e.seconds)
}
const Me = b("hockeyTimerStore", {
    state: () => ({
        matchMinutes: 0,
        matchSeconds: 0,
        isTimerRunning: !1,
        isClockwise: !1,
        _driftCorrectionMs: 0,
        _penaltyTimerRunning: !1,
        penaltyHome: [O(), O()],
        penaltyAway: [O(), O()],
        powerPlayText: "",
        powerPlaySide: ""
    }),
    getters: {
        matchTimeFormatted() {
            return te(this.matchMinutes) + ":" + te(this.matchSeconds)
        },
        homePenaltiesFormatted() {
            return this.penaltyHome.filter(e => e.active).map(e => Ae(e))
        },
        awayPenaltiesFormatted() {
            return this.penaltyAway.filter(e => e.active).map(e => Ae(e))
        },
        hasPenalties() {
            return this.penaltyHome.some(e => e.active) || this.penaltyAway.some(e => e.active)
        },
        isPowerPlayAdvantage() {
            return this.powerPlayText !== "" && !ts.includes(this.powerPlayText)
        },
        showPowerPlay() {
            return this.powerPlayText !== ""
        }
    },
    actions: {
        handleTimerDirect(e) {
            this.setTimeDirection(e.TD);
            const t = es(e.VC)
                , i = t !== null && ss.has(t);
            e.TT === "0" || i ? this.stopMatchTimer() : e.TT === "1" && this.startMatchTimer(),
                this._applySmoothSync(e.TM, e.TS)
        },
        _applySmoothSync(e, t) {
            if (e == null && t == null)
                return;
            const i = e != null ? parseInt(e) || 0 : this.matchMinutes
                , s = t != null ? parseInt(t) || 0 : this.matchSeconds
                , a = i * 60 + s
                , n = this.matchMinutes * 60 + this.matchSeconds
                , r = a - n;
            if (!this.isTimerRunning) {
                this.matchMinutes = i,
                    this.matchSeconds = s,
                    this._driftCorrectionMs = 0;
                return
            }
            if (r === 0) {
                this._driftCorrectionMs = 0;
                return
            }
            if (Math.abs(r) === 1) {
                this._driftCorrectionMs = r * 200;
                return
            }
            this.matchMinutes = i,
                this.matchSeconds = s,
                this._driftCorrectionMs = 0
        },
        setTimeDirection(e) {
            e != null && (this.isClockwise = e === "0")
        },
        startMatchTimer() {
            this.isTimerRunning = !0,
                this._ensureTimerInterval(),
            this.hasPenalties && this._ensurePenaltyInterval()
        },
        stopMatchTimer() {
            this.isTimerRunning = !1
        },
        _ensureTimerInterval() {
            V === null && this._scheduleNextTick()
        },
        _scheduleNextTick() {
            let t = 0;
            if (this._driftCorrectionMs !== 0) {
                const s = Math.sign(this._driftCorrectionMs) * Math.min(200, Math.abs(this._driftCorrectionMs));
                t = -s,
                    this._driftCorrectionMs -= s,
                Math.abs(this._driftCorrectionMs) < 10 && (this._driftCorrectionMs = 0)
            }
            const i = Math.max(500, Math.min(1500, 1e3 + t));
            V = setTimeout( () => {
                    V = null,
                        this._tickMatchTimer(),
                    this.isTimerRunning && this._scheduleNextTick()
                }
                , i)
        },
        _tickMatchTimer() {
            this.isTimerRunning && (this.isClockwise ? this.matchSeconds >= 59 ? (this.matchMinutes += 1,
                this.matchSeconds = 0) : this.matchSeconds += 1 : this.matchSeconds <= 0 ? this.matchMinutes > 0 && (this.matchMinutes -= 1,
                this.matchSeconds = 59) : this.matchSeconds -= 1)
        },
        _ensurePenaltyInterval() {
            N === null && (this._penaltyTimerRunning = !0,
                this._schedulePenaltyTick())
        },
        _schedulePenaltyTick() {
            N = setTimeout( () => {
                    N = null,
                        this._tickPenaltyTimers(),
                        this._penaltyTimerRunning && this.hasPenalties ? this._schedulePenaltyTick() : this._penaltyTimerRunning = !1
                }
                , 1e3)
        },
        _tickPenaltyTimers() {
            if (!this.isTimerRunning)
                return;
            const e = [...this.penaltyHome, ...this.penaltyAway];
            for (const t of e)
                t.active && (t.seconds <= 0 ? t.minutes > 0 ? (t.minutes -= 1,
                    t.seconds = 59) : t.active = !1 : (t.seconds -= 1,
                t.minutes === 0 && t.seconds === 0 && (t.active = !1)))
        },
        syncPenalties(e, t) {
            const i = e ? e.split(",").filter(r => r.trim() !== "" && r.trim() !== "null" && r.trim() !== "00:00") : []
                , s = t ? t.split(",").filter(r => r.trim() !== "" && r.trim() !== "null" && r.trim() !== "00:00") : [];
            for (let r = 0; r < 2; r++)
                this.penaltyHome[r] = r < i.length ? Ce(i[r].trim()) : O();
            for (let r = 0; r < 2; r++)
                this.penaltyAway[r] = r < s.length ? Ce(s[r].trim()) : O();
            const a = 5 - i.length
                , n = 5 - s.length;
            a < 5 || n < 5 ? (this.powerPlayText = Math.max(a, n) + " ON " + Math.min(a, n),
                this.powerPlaySide = i.length <= s.length ? "home" : "away") : (this.powerPlayText = "",
                this.powerPlaySide = ""),
            this.hasPenalties && this._ensurePenaltyInterval()
        },
        disposeTimer() {
            V !== null && (clearTimeout(V),
                V = null),
            N !== null && (clearTimeout(N),
                N = null),
                this.isTimerRunning = !1,
                this._penaltyTimerRunning = !1,
                this._driftCorrectionMs = 0
        }
    }
})
    , is = /^\d+:.*~.*$/;
function Ke(e) {
    return e ? is.test(e) : !1
}
function Y(e) {
    return e ? e.split(",").map(t => Number(t)) : []
}
function Qs(e) {
    if (!e)
        return null;
    const t = e.includes("^") ? e.split("^")[0] : e;
    if (!Ke(t))
        return null;
    const i = t.substring(t.indexOf(":") + 1)
        , [s,a] = i.split("~")
        , n = Y(s).filter(o => o === 1).length
        , r = Y(a).filter(o => o === 1).length;
    return {
        home: n,
        away: r
    }
}
const Le = b("shootoutStore", {
    state: () => ({
        isShootout: !1,
        homeAttempts: [],
        awayAttempts: [],
        suddenDeathDisplay: !1,
        suddenDeathBase: 3,
        prevHomeScore: 0,
        prevAwayScore: 0
    }),
    getters: {
        homeScore() {
            return this.homeAttempts.filter(e => e === 1).length
        },
        awayScore() {
            return this.awayAttempts.filter(e => e === 1).length
        },
        shootoutScoreText() {
            return `${this.homeScore}:${this.awayScore}`
        },
        isSuddenDeath() {
            return this.homeAttempts.length >= 3 && this.awayAttempts.length >= 3
        },
        homeDotsDisplay() {
            return Re(this.homeAttempts, this.suddenDeathDisplay, this.suddenDeathBase)
        },
        awayDotsDisplay() {
            return Re(this.awayAttempts, this.suddenDeathDisplay, this.suddenDeathBase)
        }
    },
    actions: {
        startShootout() {
            this.isShootout = !0,
                this.homeAttempts = [],
                this.awayAttempts = [],
                this.suddenDeathDisplay = !1,
                this.suddenDeathBase = 3,
                this.prevHomeScore = 0,
                this.prevAwayScore = 0
        },
        endShootout() {
            this.isShootout = !1,
                this.suddenDeathDisplay = !1
        },
        confirmSuddenDeath() {
            (this.homeAttempts.length > 3 || this.awayAttempts.length > 3) && (this.suddenDeathDisplay = !0,
                this.suddenDeathBase = Math.max(this.homeAttempts.length, this.awayAttempts.length) - 1)
        },
        parseShootoutPG(e, t=!1, i=!1) {
            if (!e)
                return;
            i && (this.prevHomeScore = this.homeScore,
                this.prevAwayScore = this.awayScore);
            let s = e;
            if (e.includes("^") && (s = e.split("^")[0]),
                !Ke(s))
                return;
            const a = s.substring(s.indexOf(":") + 1)
                , [n,r] = a.split("~");
            t ? (this.homeAttempts = Y(r),
                this.awayAttempts = Y(n)) : (this.homeAttempts = Y(n),
                this.awayAttempts = Y(r))
        }
    }
});
function Re(e, t, i) {
    if (!t) {
        const s = [];
        for (let a = 0; a < 3; a++)
            a < e.length ? s.push(e[a] === 1 ? "scored" : "missed") : s.push("pending");
        return s
    }
    return e.length > i ? [e[e.length - 1] === 1 ? "scored" : "missed"] : ["pending"]
}
A(M({
    sportId: 2,
    name: "Hockey",
    dataStrategy: "custom",
    handleData: async (e, t) => {
        const {useExecutionQueueStore: i} = await p(async () => {
                const {useExecutionQueueStore: r} = await Promise.resolve().then( () => se);
                return {
                    useExecutionQueueStore: r
                }
            }
            , void 0, import.meta.url)
            , {createHockeyQueueJob: s} = await p(async () => {
                const {createHockeyQueueJob: r} = await import("./createHockeyQueueJob-CCtfHQ6S.js");
                return {
                    createHockeyQueueJob: r
                }
            }
            , __vite__mapDeps([12, 13, 4, 14, 15, 16, 6, 7, 8]), import.meta.url);
        Me().handleTimerDirect(t);
        const n = i();
        for (const r of s(t))
            n.enqueue(r)
    }
    ,
    zoneComponent: () => p( () => import("./ZoneField-DwAYwhm7.js").then(e => e.Z), __vite__mapDeps([17, 13, 4, 14, 18, 19, 3, 20]), import.meta.url),
    zoneFlags: {
        showTimer: !0,
        showTeamScore: !1,
        showBottomPanel: !0,
        showSubScore: !1
    },
    bgColor: e => e ? "#01608f" : "#dae7ed",
    getTeamIcon: () => I( () => p( () => import("./TeeShirtIcon-Iwt10elY.js"), __vite__mapDeps([21, 3, 4]), import.meta.url)),
    teamIconSize: {
        lands: "12vh",
        portrait: "7vw"
    },
    teamInfoMargin: {
        lands: "0 3vh",
        portrait: "0 2vw"
    },
    timerBarComponent: I( () => p( () => import("./HockeyTimerBarSwitcher-YQqOma4f.js"), __vite__mapDeps([22, 4, 6, 7, 8]), import.meta.url)),
    show3DToggle: !0,
    useTeamColors: !0,
    showTimerIcon: () => !Le().isShootout,
    getTimerValue: () => {
        const e = Le();
        return e.isShootout ? e.shootoutScoreText : Me().matchTimeFormatted
    }
}));
const me = b("executionQueue", {
    state: () => ({
        queue: [],
        currentJob: null,
        isPaused: !1,
        isRunning: !1,
        isWaitingRelease: !1,
        isHolding: !1,
        pendingReleaseId: null,
        pauseReason: null
    }),
    getters: {
        size: e => e.queue.length,
        isBusy: e => e.isRunning || e.isWaitingRelease || e.isPaused
    },
    actions: {
        enqueue(e) {
            var t;
            if (e.coalesceKey && ((t = this.queue[this.size - 1]) == null ? void 0 : t.coalesceKey) === e.coalesceKey) {
                this.queue[this.size - 1] = e;
                return
            }
            this.queue.push(e),
                this.processNext()
        },
        pause(e="manual") {
            this.isPaused = !0,
                this.pauseReason = e
        },
        resume() {
            this.isPaused = !1,
                this.pauseReason = null,
                this.processNext()
        },
        release(e) {
            var i;
            if (!this.currentJob || e && this.currentJob.id !== e)
                return;
            if (!this.isWaitingRelease) {
                this.isHolding && (this.pendingReleaseId = this.currentJob.id);
                return
            }
            const t = this.currentJob;
            this.isWaitingRelease = !1,
                this.isRunning = !1,
                this.currentJob = null,
            (i = t.onFinish) == null || i.call(t, t),
                this.processNext()
        },
        clear() {
            this.queue = [],
                this.currentJob = null,
                this.isPaused = !1,
                this.isRunning = !1,
                this.isWaitingRelease = !1,
                this.isHolding = !1,
                this.pendingReleaseId = null,
                this.pauseReason = null
        },
        async processNext() {
            var i, s, a, n;
            if (this.isBusy || !this.size)
                return;
            const e = Date.now();
            for (; this.queue.length && this.queue[0].expiresAt && this.queue[0].expiresAt < e; )
                this.queue.shift();
            if (!this.size)
                return;
            const t = this.queue.shift();
            this.currentJob = t,
                this.isRunning = !0;
            try {
                (i = t.onStart) == null || i.call(t, t);
                const r = performance.now();
                if (await t.run(t.payload),
                ((s = this.currentJob) == null ? void 0 : s.id) !== t.id)
                    return;
                const o = t.minDurationMs ?? 0
                    , c = performance.now() - r;
                if (c < o && (this.isHolding = !0,
                    await new Promise(l => setTimeout(l, o - c)),
                    this.isHolding = !1,
                ((a = this.currentJob) == null ? void 0 : a.id) !== t.id))
                    return;
                if (t.blocking && t.waitForRelease && this.pendingReleaseId !== t.id) {
                    this.isWaitingRelease = !0,
                        setTimeout( () => {
                                var l;
                                this.isWaitingRelease && ((l = this.currentJob) == null ? void 0 : l.id) === t.id && this.release(t.id)
                            }
                            , 8e3);
                    return
                }
                this.pendingReleaseId = null,
                    this.isRunning = !1,
                    this.currentJob = null,
                (n = t.onFinish) == null || n.call(t, t),
                    queueMicrotask( () => this.processNext())
            } catch {
                this.isRunning = !1,
                    this.isWaitingRelease = !1,
                    this.isHolding = !1,
                    this.pendingReleaseId = null,
                    this.currentJob = null,
                    queueMicrotask( () => this.processNext())
            }
        }
    }
})
    , se = Object.freeze(Object.defineProperty({
    __proto__: null,
    useExecutionQueueStore: me
}, Symbol.toStringTag, {
    value: "Module"
}));
var _ = (e => (e[e.Serve = 1113] = "Serve",
    e[e.Point = 1114] = "Point",
    e[e.Fault = 1115] = "Fault",
    e[e.DoubleFault = 1116] = "DoubleFault",
    e[e.Ace = 1117] = "Ace",
    e[e.BreakPoints = 1118] = "BreakPoints",
    e[e.BreakPointsAlt = 1182] = "BreakPointsAlt",
    e[e.Game = 1119] = "Game",
    e[e.Statistic = 1120] = "Statistic",
    e[e.LetFirstServe = 1121] = "LetFirstServe",
    e[e.LetSecondServe = 1122] = "LetSecondServe",
    e[e.GameSetMatch = 1123] = "GameSetMatch",
    e[e.EndOfSet = 1124] = "EndOfSet",
    e[e.TieBreak = 1125] = "TieBreak",
    e[e.RainDelay = 1127] = "RainDelay",
    e[e.FirstSet = 1134] = "FirstSet",
    e[e.SecondSet = 1135] = "SecondSet",
    e[e.ThirdSet = 1136] = "ThirdSet",
    e[e.FourthSet = 1137] = "FourthSet",
    e[e.FinalSet = 1138] = "FinalSet",
    e[e.MatchComplete = 2e3] = "MatchComplete",
    e))(_ || {});
function C(e) {
    return !e || e === "null" ? "" : e.includes("^") ? e.split("^")[0] : e
}
function U(e) {
    const t = e.split("~");
    return [t[0] ?? "", t[1] ?? ""]
}
function Oe(e) {
    const t = e.trim()
        , i = t.indexOf(" ");
    if (i === -1)
        return {
            value: t
        };
    const s = t.slice(0, i)
        , a = t.slice(i + 1).trim();
    return a ? {
        value: s,
        sub: a
    } : {
        value: s
    }
}
function as(e) {
    return ["1st Set", "2nd Set", "3rd Set", "4th Set", "Final Set"][e - 1] ?? ""
}
function K(e) {
    return e ? z().text[e] || e : ""
}
const ns = b("tennisStatStore", {
    state: () => ({
        setScores: [],
        aces: ["", ""],
        breakPointsWon: [{
            value: ""
        }, {
            value: ""
        }],
        firstServePts: ["", ""],
        secondServePts: ["", ""],
        raw: ""
    }),
    getters: {
        statRows(e) {
            const t = [];
            if (e.setScores.length > 0) {
                const n = e.setScores[e.setScores.length - 1];
                t.push({
                    label: K(as(e.setScores.length)),
                    left: n[0] ?? "",
                    right: n[1] ?? ""
                })
            }
            (e.aces[0] !== "" || e.aces[1] !== "") && t.push({
                label: K("Aces"),
                left: e.aces[0],
                right: e.aces[1]
            });
            const i = e.breakPointsWon;
            (i[0].value !== "" || i[1].value !== "") && t.push({
                label: K("Break Points Won"),
                left: i[0].value,
                right: i[1].value,
                leftSub: i[0].sub,
                rightSub: i[1].sub
            });
            const s = e.firstServePts;
            (s[0] !== "" || s[1] !== "") && t.push({
                label: K("1st Serve Pts Won"),
                left: `${s[0]}%`,
                right: `${s[1]}%`
            });
            const a = e.secondServePts;
            return (a[0] !== "" || a[1] !== "") && t.push({
                label: K("2nd Serve Pts Won"),
                left: `${a[0]}%`,
                right: `${a[1]}%`
            }),
                t
        }
    },
    actions: {
        setData(e, t=!1) {
            if (this.raw = e,
                this.reset(!1),
                !e)
                return;
            const s = (e.includes("^") ? e.split("^").pop() : e).split("#")
                , a = s[0] ?? ""
                , n = (a.split("~")[0] ?? "").split(":")
                , r = (a.split("~")[1] ?? "").split(":")
                , o = Math.max(n.length, r.length)
                , c = [];
            for (let S = 0; S < o; S++) {
                const f = (n[S] ?? "").trim()
                    , T = (r[S] ?? "").trim();
                c.push([f, T])
            }
            this.setScores = t ? c.map(S => [S[1], S[0]]) : c;
            const l = U((s[1] ?? "").trim());
            this.aces = t ? [l[1], l[0]] : l;
            const u = U((s[2] ?? "").trim())
                , v = [Oe(u[0]), Oe(u[1])];
            this.breakPointsWon = t ? [v[1], v[0]] : v;
            const h = U((s[3] ?? "").trim());
            this.firstServePts = t ? [h[1], h[0]] : h;
            const m = U((s[4] ?? "").trim());
            this.secondServePts = t ? [m[1], m[0]] : m
        },
        reset(e=!0) {
            this.setScores = [],
                this.aces = ["", ""],
                this.breakPointsWon = [{
                    value: ""
                }, {
                    value: ""
                }],
                this.firstServePts = ["", ""],
                this.secondServePts = ["", ""],
            e && (this.raw = "")
        }
    }
});
function rs(e) {
    const t = C(e).split("#");
    return {
        count: t[0] ?? "",
        won: t[1] ?? "",
        detail: t[2] ?? ""
    }
}
function os(e) {
    const t = C(e).split("#");
    return {
        setOrKind: t[0] ?? "",
        value: t[1] ?? ""
    }
}
function cs(e) {
    const t = C(e).split("#");
    return t[1] ?? t[0] ?? ""
}
function ls(e, t) {
    const i = e.length === 5 ? Number(e.substring(1)) : Number(e);
    let s = e.length === 5 ? e.charAt(0) : "0";
    return t && e.length === 5 && (s = s === "1" ? "2" : s === "2" ? "1" : "0"),
        {
            eventCode: i,
            teamNum: s === "1" ? 1 : s === "2" ? 2 : 0
        }
}
const us = "tennis-score-"
    , xe = b("tennisStore", {
    state: () => ({
        event: ue,
        currentServeTeam: 0,
        nomTry: 1,
        score: ["0", "0"],
        displayScore: ["0", "0"],
        gameScorePending: !1,
        subScore: "",
        lastSS: "",
        lastPG: "",
        changeSide: !1,
        isRotated: !1,
        pendingSideSwap: !1,
        isServe: !1,
        isPoint: !1,
        isFault: !1,
        isDoubleFault: !1,
        isAce: !1,
        isLet: !1,
        isBreakPoints: !1,
        isGame: !1,
        isStat: !1,
        isSetEvent: !1,
        isTieBreak: !1,
        isMatchComplete: !1,
        gameKind: 0,
        gameValue: "",
        breakPointsText: "",
        breakPointsWonText: "",
        breakPointsDetail: "",
        doubleFaultTotal: "",
        tieBreakText: "",
        eventSeq: 0,
        currentEventCode: 0,
        flightInProgress: !1,
        panelCount: 0,
        scoreAnimPending: !1,
        metricAnimPending: null,
        statUIHidden: !1,
        courtSurface: "hard",
        courtSurfaceSet: !1,
        playerSex: "male"
    }),
    getters: {
        panelInProgress(e) {
            return e.panelCount > 0
        },
        isActiveEvent() {
            return this.isServe || this.isPoint || this.isFault || this.isDoubleFault || this.isAce || this.isLet || this.isBreakPoints || this.isGame || this.isStat || this.isSetEvent || this.isTieBreak || this.isMatchComplete
        },
        hasFlightEvent() {
            return this.isPoint || this.isFault || this.isLet
        },
        hasPanelEvent() {
            return this.isDoubleFault || this.isBreakPoints || this.isGame
        }
    },
    actions: {
        async setData(e) {
            const t = P()
                , i = e.Rotate === "1" || t.Event.Rotate === "1";
            this.isRotated = i,
            e.sex !== void 0 && (this.playerSex = String(e.sex).toLowerCase() === "female" ? "female" : "male");
            const s = {};
            let a = null;
            if (e.VC && e.VC !== "" && e.VC !== "0") {
                const {eventCode: n, teamNum: r} = ls(e.VC, i);
                a = n,
                    this.resetState(),
                    this.applyEvent(n, r, e, s, i),
                    this.currentEventCode = n,
                    this.eventSeq++
            }
            if (e.PG !== void 0 && (!e.VC || e.VC === "" || e.VC === "0") && (this.lastPG = C(e.PG),
                this.applyGameScoreFromPG(e.PG)),
            Object.keys(s).length && await t.setDataInfo(s),
                e.SS) {
                const n = a === _.Point || a === _.Ace;
                this.lastSS !== "" && e.SS !== this.lastSS && !n && (this.score = ["0", "0"],
                    this.displayScore = ["0", "0"],
                    this.gameScorePending = !1),
                    this.lastSS = e.SS,
                    this.subScore = e.SS.split(",").join(", ")
            }
            if (e.SubSS && this.applyGameScoreFromPG(e.SubSS),
            e.XP !== void 0) {
                const n = !!(e.VC && e.VC !== "" && e.VC !== "0");
                this.applyGameScoreFromXP(e.XP, !n)
            }
            return await t.setData(e, !0),
            e.TeamKits && await this.setTeam(e),
                this.$patch({
                    event: {
                        ...this.event,
                        ...e
                    }
                }),
                !0
        },
        applyEvent(e, t, i, s, a) {
            const n = ns();
            switch (e) {
                case _.Serve:
                {
                    this.currentServeTeam = t,
                        this.isServe = !0,
                    this.pendingSideSwap && (this.changeSide = !this.changeSide,
                        this.pendingSideSwap = !1),
                        s.event_num = e,
                        s.event_team_num = t,
                        this.lastPG = C(i.PG),
                        this.applyGameScoreFromPG(i.PG);
                    break
                }
                case _.Point:
                {
                    this.isPoint = !0,
                        this.nomTry = 1,
                        s.event_num = e,
                        s.event_team_num = t,
                        this.lastPG = C(i.PG),
                        this.applyGameScoreFromPG(i.PG, !0),
                        this.changeSide = !this.changeSide;
                    break
                }
                case _.Fault:
                {
                    this.isFault = !0,
                        this.nomTry = 2,
                        s.event_num = e,
                        s.event_team_num = t;
                    break
                }
                case _.DoubleFault:
                {
                    this.isDoubleFault = !0,
                        this.nomTry = 1,
                        this.doubleFaultTotal = C(i.PG),
                        s.event_num = e,
                        s.event_team_num = t;
                    break
                }
                case _.Ace:
                {
                    this.isAce = !0,
                        s.event_num = e,
                        s.event_team_num = t,
                        this.lastPG = C(i.PG),
                        this.applyGameScoreFromPG(i.PG, !0);
                    break
                }
                case _.BreakPoints:
                case _.BreakPointsAlt:
                {
                    this.isBreakPoints = !0;
                    const r = rs(i.PG ?? "");
                    this.breakPointsText = r.count,
                        this.breakPointsWonText = r.won,
                        this.breakPointsDetail = r.detail,
                        s.event_num = e,
                        s.event_team_num = t;
                    break
                }
                case _.Game:
                {
                    this.isGame = !0;
                    const r = os(i.PG ?? "")
                        , o = !!r.setOrKind && !!r.value;
                    this.gameKind = o ? r.setOrKind === "1" ? 1 : 2 : 0,
                        this.gameValue = o ? r.value : "",
                        s.event_num = e,
                        s.event_team_num = t,
                        this.nomTry = 1,
                        this.score = ["0", "0"],
                        this.displayScore = ["0", "0"],
                        this.gameScorePending = !1;
                    break
                }
                case _.Statistic:
                {
                    this.isStat = !0,
                        s.event_num = e,
                        s.event_team_num = t,
                        n.setData(i.PG ?? "", a);
                    break
                }
                case _.LetFirstServe:
                case _.LetSecondServe:
                {
                    this.isLet = !0,
                        this.nomTry = e === _.LetFirstServe ? 1 : 2,
                        s.event_num = e,
                        s.event_team_num = t;
                    break
                }
                case _.GameSetMatch:
                case _.EndOfSet:
                case _.RainDelay:
                case _.FirstSet:
                case _.SecondSet:
                case _.ThirdSet:
                case _.FourthSet:
                case _.FinalSet:
                {
                    this.isSetEvent = !0,
                        s.event_num = e,
                        s.event_team_num = t,
                        this.score = ["0", "0"],
                        this.displayScore = ["0", "0"],
                        this.gameScorePending = !1,
                        this.pendingSideSwap = !0;
                    break
                }
                case _.TieBreak:
                {
                    this.isTieBreak = !0,
                        this.tieBreakText = cs(i.PG ?? ""),
                        s.event_num = e,
                        s.event_team_num = t;
                    break
                }
                case _.MatchComplete:
                {
                    this.isMatchComplete = !0,
                        s.event_num = e,
                        s.event_team_num = t;
                    break
                }
            }
        },
        applyGameScoreFromPG(e, t=!1) {
            const i = C(e);
            if (!i || i.includes("~") || i.includes("#"))
                return;
            const s = i.split(":");
            s.length === 2 && this.commitGameScore([s[0].trim(), s[1].trim()], t)
        },
        applyGameScoreFromXP(e, t=!1) {
            const i = C(e);
            if (!i)
                return;
            const s = i.split("-");
            s.length === 2 && this.commitGameScore([s[0].trim(), s[1].trim()], t)
        },
        commitGameScore(e, t) {
            if (!e[0] || !e[1])
                return;
            if (this.score = [e[0], e[1]],
                t) {
                this.gameScorePending = !0;
                return
            }
            if (this.gameScorePending)
                return;
            me().queue.some(s => {
                    var a;
                    return (a = s.coalesceKey) == null ? void 0 : a.startsWith(us)
                }
            ) || (this.displayScore = [e[0], e[1]])
        },
        async setTeam(e) {
            var a;
            const t = P()
                , i = ee()
                , s = {};
            if ((a = e.TeamKits) != null && a.length) {
                const n = t.Event.Rotate === "1"
                    , r = e.TeamKits[0]
                    , o = e.TeamKits[1]
                    , c = (r.AD ?? "").split("#")[0];
                !this.courtSurfaceSet && c && (this.courtSurface = c === "Clay" ? "clay" : c === "Grass" ? "grass" : "hard",
                    this.courtSurfaceSet = !0),
                r.TC && (s.Color1 = r.TC),
                o.TC && (s.Color2 = o.TC),
                r.SC && (s.SC1 = r.SC.trim()),
                o.SC && (s.SC2 = o.SC.trim());
                const l = e.TeamKits[n ? 1 : 0]
                    , u = e.TeamKits[n ? 0 : 1];
                l.S2 && (s.S2_1 = l.S2),
                u.S2 && (s.S2_2 = u.S2),
                l.S3 && (s.S3_1 = l.S3),
                u.S3 && (s.S3_2 = u.S3),
                l.S4 && (s.S4_1 = l.S4),
                u.S4 && (s.S4_2 = u.S4)
            }
            await i.setData(s)
        },
        startFlight() {
            this.flightInProgress = !0
        },
        endFlight() {
            this.flightInProgress = !1
        },
        startPanel() {
            this.panelCount++
        },
        endPanel() {
            this.panelCount > 0 && this.panelCount--
        },
        resetState() {
            this.isServe = !1,
                this.isPoint = !1,
                this.isFault = !1,
                this.isDoubleFault = !1,
                this.isAce = !1,
                this.isLet = !1,
                this.isBreakPoints = !1,
                this.isGame = !1,
                this.isStat = !1,
                this.isSetEvent = !1,
                this.isTieBreak = !1,
                this.isMatchComplete = !1,
                this.gameKind = 0,
                this.gameValue = "",
                this.breakPointsText = "",
                this.breakPointsWonText = "",
                this.breakPointsDetail = "",
                this.doubleFaultTotal = "",
                this.tieBreakText = "",
                this.statUIHidden = !1
        }
    }
});
A(M({
    sportId: 4,
    name: "Tennis",
    dataStrategy: "custom",
    handleData: async (e, t) => {
        const {useExecutionQueueStore: i} = await p(async () => {
                const {useExecutionQueueStore: n} = await Promise.resolve().then( () => se);
                return {
                    useExecutionQueueStore: n
                }
            }
            , void 0, import.meta.url)
            , {createTennisQueueJob: s} = await p(async () => {
                const {createTennisQueueJob: n} = await import("./createTennisQueueJob-rdLUqumr.js");
                return {
                    createTennisQueueJob: n
                }
            }
            , __vite__mapDeps([23, 15, 4, 24, 6, 7, 8]), import.meta.url)
            , a = i();
        for (const n of s(t))
            a.enqueue(n)
    }
    ,
    zoneComponent: () => p( () => import("./ZoneField-cyvGWQrR.js").then(e => e.Z), __vite__mapDeps([25, 18, 4, 7, 26, 15, 27, 1, 3, 28]), import.meta.url),
    zoneFlags: {
        showTimer: !1,
        showTeamScore: !1,
        showBottomPanel: !0,
        showSubScore: !0
    },
    bgColor: e => e ? "#01608f" : "#296490",
    defaultV3D: !0,
    formatScore: () => {
        const e = xe().displayScore;
        return `${e[0] || "0"}:${e[1] || "0"}`
    }
    ,
    getSubScoreValue: () => xe().subScore || "",
    useTeamColors: !0,
    show3DToggle: !0
}));
A(M({
    sportId: 5,
    name: "Baseball",
    dataStrategy: "none",
    skipVC2000: !0,
    zoneComponent: () => p( () => import("./DefaultZone-lZF561nd.js"), __vite__mapDeps([5, 4, 3, 6, 7, 8, 9]), import.meta.url),
    zoneFlags: {
        showTimer: !1,
        showTeamScore: !1,
        showBottomPanel: !1,
        showSubScore: !1
    },
    bgColor: "#fff",
    formatScore: e => {
        var t;
        return ((t = e == null ? void 0 : e.split("^")[0]) == null ? void 0 : t.replace("-", ":")) || "0:0"
    }
}));
const Fe = b("DartsData", {
    state: () => ({
        Event: 0,
        activeTeam: 0,
        position: [],
        legs: [],
        actualScore: 0,
        score: [501, 501],
        totalLegs: 0,
        actualLeg: [0, 0],
        showTable: !1,
        tableTeam: 0,
        textEvent: "",
        showStats: !1,
        styleGraphic: !1
    }),
    getters: {
        countLegs: e => e.legs.length
    },
    actions: {
        async setData(e) {
            const t = P();
            this.activeTeam = t.Info.event_team_num;
            const i = this.activeTeam - 1;
            this.score[i] == 0 && (this.legs = [],
                this.score[i] = 501);
            const s = e.split("#")
                , a = await this.setLegs(s[0]);
            a && this.legs != a && (this.legs = a),
            s[1] && this.setScore(s[1]),
                this.legs.length > 0 ? await this.calcScore() : this.actualScore = 0
        },
        async setLegs(e) {
            var a;
            let t = [];
            const i = e.split(":");
            for (var s = 0; s < i.length; s++) {
                const n = /\d+/g
                    , r = (a = i[s].match(n)) == null ? void 0 : a.join("")
                    , o = i[s].replace(/[^a-zA-Z]+/g, "")
                    , c = {
                    value: r || 0,
                    text: o
                };
                t.push(c)
            }
            return t
        },
        setScore(e) {
            switch (this.activeTeam) {
                case 1:
                    this.score[0] = Number(e);
                    break;
                case 2:
                    this.score[1] = Number(e);
                    break
            }
        },
        async setLoadScore(e) {
            const i = P().Event.SS.split("-").map(Number);
            let s = e;
            if (s[0] == this.actualScore && this.activeTeam == 1 && (s[0] = 0),
            s[1] == this.actualScore && this.activeTeam == 2 && (s[1] = 0),
            this.activeTeam == 0 && (s[0] > 0 || s[1] > 0)) {
                const a = i.indexOf(Math.max.apply(null, i));
                s[a] = 0
            }
            e[0] == 0 && e[1] == 0 ? this.score = [501, 501] : this.score = s
        },
        async calcScore() {
            let e = 0
                , t = !1;
            for (let i = 0; i < this.legs.length; i++) {
                const s = this.legs[i].value;
                let a = 0;
                const n = this.legs[i].text;
                n == "D" ? (a = 2,
                    t = !1) : n == "B" || n == "M" || t || n == "X" ? a = 0 : a = n == "T" ? 3 : 1,
                    e = e + s * a
            }
            this.actualScore = e
        },
        setInfo(e) {
            var t;
            if (!this.totalLegs) {
                const i = /\d+/g
                    , s = (t = e.match(i)) == null ? void 0 : t.join("");
                this.totalLegs = Number(s)
            }
        },
        async setEvent(e) {
            const i = z().text;
            switch (e > 1e4 ? Number(String(e).substring(1)) : e) {
                case 1139:
                    this.textEvent = i["Double Fault"],
                        await this.setTable(e);
                    break;
                case 1162:
                    this.textEvent = i.bust,
                        await this.setTable(e);
                    break;
                case 1164:
                    this.textEvent = "Nine Dart",
                        await this.setTable(e);
                    break;
                case 1163:
                    this.textEvent = i.gameShot,
                        await this.setTable(e);
                    break;
                case 2e3:
                    this.activeTeam = 0,
                        this.textEvent = i["Match Complete"],
                        this.showTable = !0;
                    break;
                default:
                    this.Event = e,
                        this.showTable = !1,
                        this.tableTeam = 0,
                        this.textEvent = "";
                    break
            }
        },
        async setTable(e) {
            (this.tableTeam != this.activeTeam || !this.showTable) && (this.Event = e,
                this.showTable = !0,
                this.tableTeam = this.activeTeam)
        },
        setActualLeg(e) {
            const t = e.split("-").map(Number);
            this.actualLeg = t
        },
        async checkScore() {
            if (this.activeTeam < 1)
                return;
            const e = this.activeTeam - 1;
            this.score[e] == 0 && (this.legs = [],
                this.score[e] = 501)
        },
        async clearLegs() {
            this.legs = []
        }
    }
});
A(M({
    sportId: 21,
    name: "Darts",
    dataStrategy: "generic",
    zoneComponent: () => p( () => import("./ZoneField-DinsU-JR.js").then(e => e.Z), __vite__mapDeps([29, 4, 14, 7, 3, 30]), import.meta.url),
    zoneFlags: {
        showTimer: !0,
        showTeamScore: !1,
        showBottomPanel: !0,
        showSubScore: !1
    },
    bgColor: "radial-gradient(circle, rgba(109,165,54,1) 0%, rgba(33,80,34,1) 100%)",
    wrapperClass: "bgimage",
    bgImage: 'url("images/darts/bg.svg")',
    getTeamIcon: () => I( () => p( () => import("./ManIcon-CifNw2Rw.js"), __vite__mapDeps([31, 3, 4]), import.meta.url)),
    timerComponent: I( () => p( () => import("./TopCenterInfo-BX5xt1RG.js"), __vite__mapDeps([32, 7, 4, 3, 6, 8, 33]), import.meta.url)),
    formatScore: e => {
        let t = (e == null ? void 0 : e.replace("-", ":")) || "0:0";
        for (; t.indexOf("(") !== -1; )
            t = t.substring(0, t.indexOf("(") - 1) + t.substring(t.indexOf(")") + 1),
                t = t.replace(" ", "");
        return t
    }
    ,
    onOpenStats: () => {
        Fe().showStats = !0
    }
    ,
    isStatsAvailable: () => !Fe().showStats
}));
A(M({
    sportId: 26,
    name: "Formula 1",
    dataStrategy: "custom",
    skipVC2000: !0,
    handleData: async e => {
        const {useFormulsData: t} = await p(async () => {
                const {useFormulsData: s} = await import("./F1Data-3FF7rTbK.js").then(a => a.F);
                return {
                    useFormulsData: s
                }
            }
            , __vite__mapDeps([34, 4]), import.meta.url)
            , i = JSON.parse(e);
        t().setData(i)
    }
    ,
    zoneComponent: () => p( () => import("./ZoneField-Ba_jWUZi.js"), __vite__mapDeps([35, 34, 4, 7, 3, 36, 6, 8, 37]), import.meta.url),
    zoneFlags: {
        showTimer: !1,
        showTeamScore: !1,
        showBottomPanel: !1,
        showSubScore: !1
    },
    bgColor: "radial-gradient(circle, rgba(109,165,54,1) 0%, rgba(33,80,34,1) 100%)",
    customTopPanel: I( () => p( () => import("./F1TopPanel-B_Eqd4Sd.js"), __vite__mapDeps([38, 4, 34, 7, 36, 3, 6, 8, 39]), import.meta.url))
}));
A(M({
    sportId: 66,
    name: "Cricket",
    dataStrategy: "generic",
    zoneComponent: () => p( () => import("./ZoneField-ClbfLPWQ.js").then(e => e.Z), __vite__mapDeps([40, 4, 3, 41]), import.meta.url),
    zoneFlags: {
        showTimer: !1,
        showTeamScore: !0,
        showBottomPanel: !1,
        showSubScore: !1
    },
    bgColor: "#365203",
    fieldClass: "fieldbg",
    bgFieldImage: 'url("images/cricket/bg.svg")',
    onMountAnimation: e => {
        e.style.background = "linear-gradient( to bottom, #038fe1 30%, #355102 0%)"
    }
}));
function Js(e) {
    return ot() ? (ct(e),
        !0) : !1
}
function k(e) {
    return typeof e == "function" ? e() : Ye(e)
}
const js = typeof window < "u" && typeof document < "u";
typeof WorkerGlobalScope < "u" && globalThis instanceof WorkerGlobalScope;
const hs = Object.prototype.toString
    , ms = e => hs.call(e) === "[object Object]"
    , Us = () => {}
;
function fs(e, ...t) {
    return t.some(i => i in e)
}
function Zs(e, t={}) {
    if (!at(e))
        return nt(e);
    const i = Array.isArray(e.value) ? Array.from({
        length: e.value.length
    }) : {};
    for (const s in e.value)
        i[s] = rt( () => ({
            get() {
                return e.value[s]
            },
            set(a) {
                var n;
                if ((n = k(t.replaceRef)) != null ? n : !0)
                    if (Array.isArray(e.value)) {
                        const o = [...e.value];
                        o[s] = a,
                            e.value = o
                    } else {
                        const o = {
                            ...e.value,
                            [s]: a
                        };
                        Object.setPrototypeOf(o, Object.getPrototypeOf(e.value)),
                            e.value = o
                    }
                else
                    e.value[s] = a
            }
        }));
    return i
}
function Ss(e, t) {
    return e === t
}
function ei(...e) {
    var t;
    const i = e[0]
        , s = e[1];
    let a = (t = e[2]) != null ? t : Ss;
    if (typeof a == "string") {
        const n = a;
        a = (r, o) => r[n] === o[n]
    }
    return E( () => k(i).filter(n => k(s).findIndex(r => a(n, r)) === -1))
}
function gs(e) {
    return ms(e) && fs(e, "formIndex", "comparator")
}
function ti(...e) {
    var t;
    const i = e[0]
        , s = e[1];
    let a = e[2]
        , n = 0;
    if (gs(a) && (n = (t = a.fromIndex) != null ? t : 0,
        a = a.comparator),
    typeof a == "string") {
        const r = a;
        a = (o, c) => o[r] === k(c)
    }
    return a = a ?? ( (r, o) => r === k(o)),
        E( () => k(i).slice(n).some( (r, o, c) => a(k(r), k(s), o, k(c))))
}
const ps = /^(\d{4})[-/]?(\d{1,2})?[-/]?(\d{0,2})[T\s]*(\d{1,2})?:?(\d{1,2})?:?(\d{1,2})?[.:]?(\d+)?$/i
    , ds = /[YMDHhms]o|\[([^\]]+)\]|Y{1,4}|M{1,4}|D{1,2}|d{1,4}|H{1,2}|h{1,2}|a{1,2}|A{1,2}|m{1,2}|s{1,2}|Z{1,2}|SSS/g;
function vs(e, t, i, s) {
    let a = e < 12 ? "AM" : "PM";
    return s && (a = a.split("").reduce( (n, r) => n += `${r}.`, "")),
        i ? a.toLowerCase() : a
}
function F(e) {
    const t = ["th", "st", "nd", "rd"]
        , i = e % 100;
    return e + (t[(i - 20) % 10] || t[i] || t[0])
}
function _s(e, t, i={}) {
    var s;
    const a = e.getFullYear()
        , n = e.getMonth()
        , r = e.getDate()
        , o = e.getHours()
        , c = e.getMinutes()
        , l = e.getSeconds()
        , u = e.getMilliseconds()
        , v = e.getDay()
        , h = (s = i.customMeridiem) != null ? s : vs
        , m = {
        Yo: () => F(a),
        YY: () => String(a).slice(-2),
        YYYY: () => a,
        M: () => n + 1,
        Mo: () => F(n + 1),
        MM: () => `${n + 1}`.padStart(2, "0"),
        MMM: () => e.toLocaleDateString(i.locales, {
            month: "short"
        }),
        MMMM: () => e.toLocaleDateString(i.locales, {
            month: "long"
        }),
        D: () => String(r),
        Do: () => F(r),
        DD: () => `${r}`.padStart(2, "0"),
        H: () => String(o),
        Ho: () => F(o),
        HH: () => `${o}`.padStart(2, "0"),
        h: () => `${o % 12 || 12}`.padStart(1, "0"),
        ho: () => F(o % 12 || 12),
        hh: () => `${o % 12 || 12}`.padStart(2, "0"),
        m: () => String(c),
        mo: () => F(c),
        mm: () => `${c}`.padStart(2, "0"),
        s: () => String(l),
        so: () => F(l),
        ss: () => `${l}`.padStart(2, "0"),
        SSS: () => `${u}`.padStart(3, "0"),
        d: () => v,
        dd: () => e.toLocaleDateString(i.locales, {
            weekday: "narrow"
        }),
        ddd: () => e.toLocaleDateString(i.locales, {
            weekday: "short"
        }),
        dddd: () => e.toLocaleDateString(i.locales, {
            weekday: "long"
        }),
        A: () => h(o, c),
        AA: () => h(o, c, !1, !0),
        a: () => h(o, c, !0),
        aa: () => h(o, c, !0, !0)
    };
    return t.replace(ds, (S, f) => {
            var T, D;
            return (D = f ?? ((T = m[S]) == null ? void 0 : T.call(m))) != null ? D : S
        }
    )
}
function Ts(e) {
    if (e === null)
        return new Date(Number.NaN);
    if (e === void 0)
        return new Date;
    if (e instanceof Date)
        return new Date(e);
    if (typeof e == "string" && !/Z$/i.test(e)) {
        const t = e.match(ps);
        if (t) {
            const i = t[2] - 1 || 0
                , s = (t[7] || "0").substring(0, 3);
            return new Date(t[1],i,t[3] || 1,t[4] || 0,t[5] || 0,t[6] || 0,s)
        }
    }
    return new Date(e)
}
function Be(e, t="HH:mm:ss", i={}) {
    return E( () => _s(Ts(k(e)), k(t), i))
}
const B = [];
let re = !1
    , oe = null;
const ys = () => (oe || (oe = p( () => import("./CSData-6UfKA2dR.js").then(e => e.C), __vite__mapDeps([42, 4, 43, 7, 44]), import.meta.url)),
        oe)
    , qe = async () => {
        if (!re) {
            re = !0;
            try {
                const {useCSData: e} = await ys();
                for (; B.length; ) {
                    const t = B.shift();
                    await e().setData(t)
                }
            } finally {
                re = !1,
                B.length && qe()
            }
        }
    }
    , bs = e => {
        const t = B.at(-1);
        e.TypeEvent === "UPDATE_POSITIONS" && (t == null ? void 0 : t.TypeEvent) === "UPDATE_POSITIONS" ? B[B.length - 1] = e : B.push(e),
            qe()
    }
;
A(M({
    sportId: 86,
    name: "CS:GO",
    dataStrategy: "custom",
    skipVC2000: !0,
    handleData: e => {
        bs(JSON.parse(e))
    }
    ,
    zoneComponent: () => p( () => import("./ZoneField-CcHOMOqb.js"), __vite__mapDeps([45, 42, 4, 43, 7, 44, 3, 6, 8, 46]), import.meta.url),
    zoneFlags: {
        showTimer: !1,
        showTeamScore: !1,
        showBottomPanel: !1,
        showSubScore: !0
    },
    bgColor: "radial-gradient(circle, rgba(70,70,70,1) 50%, rgba(12,12,12,1) 100%)",
    getTeamIcon: () => I( () => p( () => import("./TeamSideLogo-Ck49banW.js"), __vite__mapDeps([47, 42, 4, 43, 7, 44, 6, 8]), import.meta.url)),
    useTeamColors: !0,
    getTimerValue: e => e.Event.t ? Be(e.Event.t, "mm:ss").value : "00:00",
    getSubScoreValue: e => e.Info.event_text.replaceAll("_", " ") + " " + Be(e.Event.t, "mm:ss").value
}));
const ws = new Set([1078, 1079, 1080, 1081, 1082, 1083, 1084, 2e3, 1085, 1086]);
let X = null;
function Ge(e) {
    return e < 10 ? "0" + e : "" + e
}
const ce = b("basketBallTimerStore", {
    state: () => ({
        matchMinutes: 0,
        matchSeconds: 0,
        isTimerRunning: !1,
        isClockwise: !1,
        period: "",
        _driftCorrectionMs: 0
    }),
    getters: {
        matchTimeFormatted() {
            return this.matchMinutes === 0 && this.matchSeconds === 0 ? "" : Ge(this.matchMinutes) + ":" + Ge(this.matchSeconds)
        },
        periodFormatted() {
            return this.period ? "Q" + this.period : ""
        }
    },
    actions: {
        handleTimerDirect(e) {
            this.setTimeDirection(e.TD),
                this.setPeriod(e.MD),
                e.TT === "0" ? this.stopMatchTimer() : e.TT === "1" && this.startMatchTimer(),
                this._applySmoothSync(e.TM, e.TS)
        },
        handleTimerFromPayload(e, t) {
            if (t !== null && ws.has(t)) {
                this.stopMatchTimer();
                return
            }
            e.TT === "1" ? this.startMatchTimer() : e.TT === "0" && this.stopMatchTimer()
        },
        setTimeDirection(e) {
            e != null && e !== "" && (this.isClockwise = e === "0")
        },
        setPeriod(e) {
            e != null && e !== "" && (this.period = e)
        },
        _applySmoothSync(e, t) {
            if (e == null && t == null)
                return;
            const i = e != null && e !== "" ? parseInt(e) || 0 : this.matchMinutes
                , s = t != null && t !== "" ? parseInt(t) || 0 : this.matchSeconds
                , a = i * 60 + s
                , n = this.matchMinutes * 60 + this.matchSeconds
                , r = a - n;
            if (!this.isTimerRunning) {
                this.matchMinutes = i,
                    this.matchSeconds = s,
                    this._driftCorrectionMs = 0;
                return
            }
            if (r === 0) {
                this._driftCorrectionMs = 0;
                return
            }
            if (Math.abs(r) === 1) {
                this._driftCorrectionMs = r * 200;
                return
            }
            this.matchMinutes = i,
                this.matchSeconds = s,
                this._driftCorrectionMs = 0
        },
        startMatchTimer() {
            this.isTimerRunning = !0,
                this._ensureTimerInterval()
        },
        stopMatchTimer() {
            this.isTimerRunning = !1
        },
        _ensureTimerInterval() {
            X === null && this._scheduleNextTick()
        },
        _scheduleNextTick() {
            let t = 0;
            if (this._driftCorrectionMs !== 0) {
                const s = Math.sign(this._driftCorrectionMs) * Math.min(200, Math.abs(this._driftCorrectionMs));
                t = -s,
                    this._driftCorrectionMs -= s,
                Math.abs(this._driftCorrectionMs) < 10 && (this._driftCorrectionMs = 0)
            }
            const i = Math.max(500, Math.min(1500, 1e3 + t));
            X = setTimeout( () => {
                    X = null,
                        this._tickMatchTimer(),
                    this.isTimerRunning && this._scheduleNextTick()
                }
                , i)
        },
        _tickMatchTimer() {
            this.isTimerRunning && (this.isClockwise ? this.matchSeconds >= 59 ? (this.matchMinutes += 1,
                this.matchSeconds = 0) : this.matchSeconds += 1 : this.matchSeconds <= 0 ? this.matchMinutes > 0 && (this.matchMinutes -= 1,
                this.matchSeconds = 59) : this.matchSeconds -= 1)
        },
        disposeTimer() {
            X !== null && (clearTimeout(X),
                X = null),
                this.isTimerRunning = !1,
                this._driftCorrectionMs = 0
        }
    }
});
A(M({
    sportId: 3,
    name: "Basketball",
    dataStrategy: "custom",
    handleData: async (e, t) => {
        const {useExecutionQueueStore: i} = await p(async () => {
                const {useExecutionQueueStore: r} = await Promise.resolve().then( () => se);
                return {
                    useExecutionQueueStore: r
                }
            }
            , void 0, import.meta.url)
            , {createBasketBallQueueJob: s} = await p(async () => {
                const {createBasketBallQueueJob: r} = await import("./createBasketBallQueueJob-MlfIrIBd.js");
                return {
                    createBasketBallQueueJob: r
                }
            }
            , __vite__mapDeps([48, 15, 4, 49, 6, 7, 8]), import.meta.url);
        ce().handleTimerDirect(t);
        const n = i();
        for (const r of s(t))
            n.enqueue(r)
    }
    ,
    zoneComponent: () => p( () => import("./ZoneField-CIoAs5rn.js").then(e => e.Z), __vite__mapDeps([50, 49, 4, 26, 15, 18, 19, 7, 3, 51]), import.meta.url),
    zoneFlags: {
        showTimer: !0,
        showTeamScore: !1,
        showBottomPanel: !0,
        showSubScore: !1
    },
    bgColor: e => e ? "#01608f" : "#be9f5b",
    defaultV3D: !0,
    useTeamColors: !0,
    timerBarComponent: I( () => p( () => import("./BasketballTimerBar-DPrQyn12.js"), __vite__mapDeps([52, 4, 14, 3, 6, 7, 8, 53]), import.meta.url)),
    getTeamIcon: () => I( () => p( () => import("./BasketTeeShirtIcon-B7Gl3Ju8.js"), __vite__mapDeps([54, 3, 4]), import.meta.url)),
    show3DToggle: !0,
    formatScore: e => {
        var t;
        return ((t = e == null ? void 0 : e.split("^")[0]) == null ? void 0 : t.replace("-", ":")) || "0:0"
    }
    ,
    scoreFontSize: {
        portrait: "3.8vw",
        lands: "5.6vh"
    },
    getTimerValue: () => ce().matchTimeFormatted,
    getTimerPrefix: () => ce().periodFormatted,
    showTimerIcon: () => !1
}));
var y = (e => (e[e.Serve = 1248] = "Serve",
    e[e.Rally = 1249] = "Rally",
    e[e.Point = 1250] = "Point",
    e[e.Fault = 1252] = "Fault",
    e[e.TotalAces = 1253] = "TotalAces",
    e[e.EndOfSet = 1254] = "EndOfSet",
    e[e.Timeout = 1255] = "Timeout",
    e[e.TechnicalTimeout = 1256] = "TechnicalTimeout",
    e[e.Stat = 1257] = "Stat",
    e[e.Graph = 1258] = "Graph",
    e[e.CurrentStreak = 1259] = "CurrentStreak",
    e[e.GoldenSet = 1260] = "GoldenSet",
    e[e.MatchComplete = 1261] = "MatchComplete",
    e[e.StartSet = 1263] = "StartSet",
    e))(y || {});
const Ps = 2e3
    , si = 170.6
    , ii = 99.9
    , ai = 7.6
    , ni = 92
    , ri = 85.3
    , oi = 169.447
    , ci = 63.871
    , li = 6.454
    , ui = 57.712
    , hi = 32.273
    , mi = 137.193
    , fi = {
    teamName: "#EDAD58",
    eventText: "#fff",
    subText: "#fff",
    gold: "#ffd24a"
}
    , Ds = "volleyball-score-";
function ks(e, t) {
    const i = e.length === 5 ? Number(e.substring(1)) : Number(e);
    let s = e.length === 5 ? e.charAt(0) : "0";
    return t && e.length === 5 && (s = s === "1" ? "2" : s === "2" ? "1" : "0"),
        {
            eventCode: i,
            teamNum: s === "1" ? 1 : s === "2" ? 2 : 0
        }
}
const Es = 6;
function Is(e, t) {
    var n;
    const i = (e ?? "").split(",").filter(Boolean)
        , s = i[0] ?? ""
        , a = [];
    for (let r = 1; r <= Es; r++) {
        const o = ((n = i[r]) == null ? void 0 : n.split(":")) ?? [];
        let c = o[1] === "1" ? 1 : o[1] === "2" ? 2 : 0;
        t && c !== 0 && (c = c === 1 ? 2 : 1),
            a.push(c === 0 ? {
                num: "",
                team: 0
            } : {
                num: o[0] ?? "",
                team: c
            })
    }
    return {
        set: s,
        points: a
    }
}
const Ve = b("volleyballStore", {
    state: () => ({
        event: ue,
        currentServeTeam: 0,
        isServe: !1,
        isRally: !1,
        isPoint: !1,
        isFault: !1,
        isAce: !1,
        isStreak: !1,
        isTimeout: !1,
        isTechTimeout: !1,
        isStat: !1,
        isGraph: !1,
        isSetEvent: !1,
        isStartSet: !1,
        isGoldenSet: !1,
        isMatchComplete: !1,
        eventSeq: 0,
        currentEventCode: 0,
        lastTeamNum: 1,
        isRotated: !1,
        score: ["0", "0"],
        displayScore: ["0", "0"],
        gameScorePending: !1,
        scoreAnimPending: !1,
        lastSS: "",
        subScore: "",
        lastED: "",
        faultsTotal: "",
        acesTotal: "",
        streakValue: "",
        statInfo: null,
        graphInfo: null
    }),
    getters: {
        ballVisible(e) {
            return e.isServe && e.currentServeTeam !== 0
        },
        isAttackZone(e) {
            return e.isRally
        },
        isOverlayActive(e) {
            return e.isSetEvent || e.isStartSet || e.isGoldenSet || e.isMatchComplete || e.isStat || e.isGraph || e.isFault || e.isAce || e.isStreak || e.isTimeout || e.isTechTimeout || e.scoreAnimPending
        }
    },
    actions: {
        async setData(e) {
            const t = P()
                , i = e.Rotate === "1" || t.Event.Rotate === "1";
            this.isRotated = i;
            const s = {};
            if (e.VC && e.VC !== "" && e.VC !== "0") {
                const {eventCode: a, teamNum: n} = ks(e.VC, i);
                n && (this.lastTeamNum = n),
                    this.resetState(),
                    this.applyEvent(a, n, e, s),
                    this.currentEventCode = a,
                    this.eventSeq++
            }
            return Object.keys(s).length && await t.setDataInfo(s),
            e.SS && this.applySS(e.SS),
            e.ED !== void 0 && e.ED !== this.lastED && (this.lastED = e.ED,
                this.subScore = e.ED.split(",").filter(Boolean).join(", ")),
                await t.setData(e, !0),
            e.TeamKits && await this.setTeam(e),
                this.$patch({
                    event: {
                        ...this.event,
                        ...e
                    }
                }),
                !0
        },
        applyEvent(e, t, i, s) {
            const a = new Set([y.Point, y.Stat, y.Graph])
                , n = t || (a.has(e) ? 0 : this.lastTeamNum);
            switch (s.event_num = e,
                s.event_team_num = n,
                e) {
                case y.Serve:
                {
                    this.currentServeTeam = t || this.lastTeamNum,
                        this.isServe = !0;
                    break
                }
                case y.Rally:
                {
                    this.isRally = !0;
                    break
                }
                case y.Point:
                {
                    this.isPoint = !0;
                    const r = i.PG ?? "";
                    if (r.includes(":") && !r.includes("^")) {
                        const o = r.split(":")
                            , c = this.isRotated ? [o[1].trim(), o[0].trim()] : [o[0].trim(), o[1].trim()]
                            , l = Number(c[0]) > Number(this.score[0]) ? 1 : Number(c[1]) > Number(this.score[1]) ? 2 : 0;
                        l && (s.event_team_num = l,
                            this.lastTeamNum = l),
                            this.commitGameScore(c, !0)
                    }
                    break
                }
                case y.Fault:
                {
                    this.isFault = !0,
                        this.faultsTotal = i.PG ?? "";
                    break
                }
                case y.TotalAces:
                {
                    this.isAce = !0;
                    const r = i.PG ?? "";
                    this.acesTotal = r.split(",")[1] ?? r;
                    break
                }
                case y.EndOfSet:
                {
                    this.isSetEvent = !0,
                        this.resetGameScore();
                    break
                }
                case y.StartSet:
                {
                    this.isStartSet = !0;
                    break
                }
                case y.Timeout:
                {
                    this.isTimeout = !0,
                    t === 0 && (s.event_team_num = 0);
                    break
                }
                case y.TechnicalTimeout:
                {
                    this.isTechTimeout = !0;
                    break
                }
                case y.Stat:
                {
                    this.isStat = !0,
                        this.statInfo = Is(i.PG, this.isRotated);
                    break
                }
                case y.Graph:
                {
                    this.isGraph = !0;
                    const [r="",o=""] = (i.PG ?? "").split("#")
                        , c = v => v.split(",").map(h => Number(h)).filter(h => !isNaN(h))
                        , l = c(r)
                        , u = c(o);
                    this.graphInfo = this.isRotated ? {
                        team1: u,
                        team2: l
                    } : {
                        team1: l,
                        team2: u
                    };
                    break
                }
                case y.CurrentStreak:
                {
                    this.isStreak = !0,
                        this.streakValue = i.PG ?? "";
                    break
                }
                case y.GoldenSet:
                {
                    this.isGoldenSet = !0,
                        this.resetGameScore();
                    break
                }
                case y.MatchComplete:
                case Ps:
                {
                    this.isMatchComplete = !0;
                    break
                }
            }
        },
        applySS(e) {
            if (e === this.lastSS)
                return;
            const t = this.lastSS === "";
            this.lastSS = e;
            const i = e.split(/[:-]/);
            if (i.length !== 2 || !i[0] || !i[1])
                return;
            const s = this.isRotated ? [i[1].trim(), i[0].trim()] : [i[0].trim(), i[1].trim()];
            if (t) {
                this.gameScorePending = !1,
                    this.score = s,
                    this.displayScore = [s[0], s[1]];
                return
            }
            s[0] === this.score[0] && s[1] === this.score[1] || this.commitGameScore(s, !0)
        },
        commitGameScore(e, t) {
            if (!e[0] || !e[1])
                return;
            if (this.score = [e[0], e[1]],
                t) {
                this.gameScorePending = !0;
                return
            }
            if (this.gameScorePending)
                return;
            me().queue.some(s => {
                    var a;
                    return (a = s.coalesceKey) == null ? void 0 : a.startsWith(Ds)
                }
            ) || (this.displayScore = [e[0], e[1]])
        },
        resetGameScore() {
            this.score = ["0", "0"],
                this.displayScore = ["0", "0"],
                this.gameScorePending = !1
        },
        async setTeam(e) {
            var s;
            const t = ee()
                , i = {};
            if ((s = e.TeamKits) != null && s.length) {
                const a = e.TeamKits[0]
                    , n = e.TeamKits[1];
                if (a != null && a.TC && (i.Color1 = a.TC),
                n != null && n.TC && (i.Color2 = n.TC),
                a != null && a.SC && (i.SC1 = a.SC.trim()),
                n != null && n.SC && (i.SC2 = n.SC.trim()),
                this.currentServeTeam === 0) {
                    const r = (a == null ? void 0 : a.PI) === "1"
                        , o = (n == null ? void 0 : n.PI) === "1";
                    if (r || o) {
                        let c = r ? 1 : 2;
                        this.isRotated && (c = c === 1 ? 2 : 1),
                            this.currentServeTeam = c
                    }
                }
            }
            await t.setData(i)
        },
        resetState() {
            this.isServe = !1,
                this.isRally = !1,
                this.isPoint = !1,
                this.isFault = !1,
                this.isAce = !1,
                this.isStreak = !1,
                this.isTimeout = !1,
                this.isTechTimeout = !1,
                this.isStat = !1,
                this.isGraph = !1,
                this.isSetEvent = !1,
                this.isStartSet = !1,
                this.isGoldenSet = !1,
                this.isMatchComplete = !1
        }
    }
});
A(M({
    sportId: 6,
    name: "Volleyball",
    dataStrategy: "custom",
    handleData: async (e, t) => {
        const {useExecutionQueueStore: i} = await p(async () => {
                const {useExecutionQueueStore: n} = await Promise.resolve().then( () => se);
                return {
                    useExecutionQueueStore: n
                }
            }
            , void 0, import.meta.url)
            , {createVolleyballQueueJob: s} = await p(async () => {
                const {createVolleyballQueueJob: n} = await import("./createVolleyballQueueJob-DQzq024F.js");
                return {
                    createVolleyballQueueJob: n
                }
            }
            , __vite__mapDeps([55, 15, 4, 6, 7, 8]), import.meta.url)
            , a = i();
        for (const n of s(t))
            a.enqueue(n)
    }
    ,
    zoneComponent: () => p( () => import("./ZoneField-CMUsw3G8.js"), __vite__mapDeps([56, 18, 4, 3, 6, 7, 8, 57]), import.meta.url),
    zoneFlags: {
        showTimer: !1,
        showTeamScore: !1,
        showBottomPanel: !0,
        showSubScore: !0
    },
    bgColor: () => "#8a4636",
    useTeamColors: !0,
    show3DToggle: !0,
    getTeamIcon: () => I( () => p( () => import("./VolleyBallTeeShirtIcon-B8V18PpZ.js"), __vite__mapDeps([58, 3, 4]), import.meta.url)),
    formatScore: () => {
        const e = Ve().displayScore;
        return `${e[0] || "0"}:${e[1] || "0"}`
    }
    ,
    getSubScoreValue: () => {
        const e = Ve();
        if (e.subScore)
            return e.subScore;
        const [t,i] = e.displayScore;
        return `${t || "0"}-${i || "0"}`
    }
}));
const Cs = lt(!1)
    , R = e => {
    Cs.value = e
}
    , As = "ConnectClient"
    , Ne = "gameData"
    , Ms = 2500
    , Ls = 3e4
    , Rs = 3e4
    , Os = ut({
    __name: "App",
    setup(e) {
        const t = I( () => p( () => import("./SportZone-ohUWYF3U.js"), __vite__mapDeps([59, 4, 7, 3, 6, 8, 60]), import.meta.url))
            , i = P()
            , s = Q()
            , a = H()
            , n = Yt()
            , r = $t()
            , o = et();
        o.connection.onreconnected( () => ie());
        const c = Qt({
            maxEntries: 2e4
        });
        let l = "", u, v = !1, h, m, S = 0;
        const f = "v2.1.98"
            , T = async g => {
                var ge, pe, de;
                let d;
                typeof g == "string" ? d = JSON.parse(g) : d = g;
                const w = JSON.stringify(d);
                if (s.isDebug || f.includes("stage")) {
                    if (!d) {
                        console.log("error data");
                        return
                    }
                    if (console.log(d),
                        s.isSaveLog) {
                        const G = i.Event.Player1_orig || d.Player1_orig
                            , x = i.Event.Player2_orig || d.Player2_orig
                            , ve = i.Event.SportId || d.SportId;
                        !l && G && x && ve && (l = `SportId_${ve}__${G}/${x}`.replaceAll(" ", "_")),
                        l && c.log(l, d)
                    }
                }
                d.SportId && d.SportId != s.Sport && s.$patch({
                    Sport: d.SportId
                });
                const L = q(s.Sport);
                if ((ge = s.rotate) != null && ge.toString() && (d.Rotate = (pe = s.rotate) == null ? void 0 : pe.toString()),
                    !(L.skipVC2000 && d.VC === "2000")) {
                    switch (L.dataStrategy) {
                        case "generic":
                            r.addEvent(d);
                            break;
                        case "custom":
                            await L.handleData(w, d);
                            break
                    }
                    if (d.EventLocations && d.EventLocations.length > 0)
                        for (let G = 0; G < d.EventLocations.length; G++) {
                            const x = d.EventLocations[G];
                            (x.ID || x.TE) && ((de = L.preprocessEventLocation) == null || de.call(L, x),
                                n.addData(x))
                        }
                }
            }
            , D = () => {
                u && (clearTimeout(u),
                    u = void 0)
            }
            , fe = async () => h || (h = (async () => {
                    D(),
                        v = !1,
                        R(!0),
                    (s.isDebug || f.includes("stage")) && console.log("SignalR first message timeout. Trying next server.");
                    try {
                        await o.connection.stop().catch( () => {}
                        ),
                            await o.connection.start(),
                            await ie()
                    } catch (g) {
                        (s.isDebug || f.includes("stage")) && console.log("SignalR reconnect by timeout error", g)
                    } finally {
                        h = void 0
                    }
                }
            )(),
                h)
            , je = () => {
                D(),
                    u = setTimeout( () => {
                            fe()
                        }
                        , Ms)
            }
            , Ue = g => {
                v = !1,
                    D(),
                    S = Date.now(),
                    T(g)
            }
            , J = async () => {
                if (document.visibilityState === "hidden") {
                    m = Date.now();
                    return
                }
                if (await r.setShowAnimation(!1),
                s.isDebug && s.debugFilePath) {
                    m = void 0;
                    return
                }
                const g = Date.now()
                    , d = m ? g - m : 0
                    , w = S ? g - S : 1 / 0;
                m = void 0,
                !(d < Ls && w < Rs) && await fe()
            }
            , ie = async () => {
                if (s.isDebug && s.debugFilePath) {
                    await we(s.debugFilePath, T, s.debugDelayMs, s.debugUseRealTiming);
                    return
                }
                o.off(Ne),
                    o.on(Ne, Ue, !1),
                    v = !0,
                    D(),
                    o.invoke(As, {
                        gameid: s.GameId,
                        sport: s.Sport,
                        lng: s.Lang || "en",
                        ver: f
                    }).then( () => {
                            (s.isDebug || f.includes("stage")) && console.log("invoke!"),
                            v && je()
                        }
                    ).catch(g => {
                            (g instanceof Error ? g.message : String(g)).includes("Invocation canceled due to the underlying connection being closed") || (s.isDebug || f.includes("stage")) && console.log("invoke error", g)
                        }
                    )
            }
        ;
        s.isDebug && (window.connectDebug = (g, d, w) => we(g, T, d, w),
            window.stopDebug = zt,
            window.loggerDownload = g => c.download(g),
            window.loggerRead = g => c.read(g),
            window.loggerClear = g => c.clear(g),
            Kt());
        const Ze = async g => {
                var d;
                if (g) {
                    await i.setData(g);
                    const w = q(s.Sport);
                    await ((d = w.onAfterBaseSetData) == null ? void 0 : d.call(w, g))
                }
            }
        ;
        r.addHandler(Ze),
            r.runQueue();
        const Se = async g => {
                if (await s.initialize(g)) {
                    const w = q(s.Sport)
                        , L = w.defaultV3D ?? !1;
                    return a.setData({
                        V3D: L
                    }),
                        Promise.resolve(w.zoneComponent()).catch( () => {}
                        ),
                        await ie(),
                        !0
                } else
                    return !1
            }
        ;
        return ht(async () => {
                if (window.addEventListener("focus", J),
                    document.addEventListener("visibilitychange", J),
                    s.hasCustomEmbedConfig)
                    Se();
                else {
                    const g = async d => {
                            await Se(d.data) && window.removeEventListener("message", g)
                        }
                    ;
                    window.addEventListener("message", g)
                }
            }
        ),
            mt( () => {
                    window.removeEventListener("focus", J),
                        document.removeEventListener("visibilitychange", J)
                }
            ),
            (g, d) => (ft(),
                St(Ye(t)))
    }
})
    , Qe = "v2.1.98"
    , Xe = Qe.includes("stage");
console.log(`ZoneViewer ${Qe}`);
dt.add(vt, _t, Tt, yt, bt, wt, Pt, Dt, kt, Et, It, Ct, At, Mt, Lt, Rt, Ot, xt);
ze.defaults({
    lazy: !1
});
const xs = JSON.parse('["https://new.maxizone.win/playerzone", "https://maxizone.win/playerzone"]')
    , Fs = e => {
    const t = [...e];
    for (let i = t.length - 1; i > 0; i--) {
        const s = Math.floor(Math.random() * (i + 1));
        [t[i],t[s]] = [t[s], t[i]]
    }
    return t
}
    , Bs = e => new Promise(t => setTimeout(t, e))
    , $e = 2e3
    , Gs = 3e3
    , Vs = 3e3
    , Je = Fs(xs)
    , Ns = Je[0]
    , Xs = (e, t) => {
    if (!t.length)
        return;
    let i, s = 0;
    const a = () => {
        const o = t[s];
        return s = (s + 1) % t.length,
            o
    }
        , n = {
        nextRetryDelayInMilliseconds({previousRetryCount: o}) {
            return R(!0),
            i && (i.baseUrl = a()),
                o > 0 && o % t.length === 0 ? $e : 0
        }
    };
    e.withAutomaticReconnect(n);
    const r = e.build.bind(e);
    e.build = () => {
        i = r();
        const o = i.start.bind(i);
        i.onreconnecting( () => R(!0)),
            i.onreconnected( () => R(!1)),
            i.onclose( () => R(!1));
        const c = async () => {
                let l, u = !1, v;
                try {
                    const h = o();
                    h.catch( () => {}
                    );
                    const m = new Promise( (S, f) => {
                            l = setTimeout( () => {
                                    u = !0,
                                        v = i == null ? void 0 : i.stop().catch( () => {}
                                        ),
                                        f(new Error("SignalR connection start timeout"))
                                }
                                , Vs)
                        }
                    );
                    await Promise.race([h, m])
                } catch (h) {
                    throw u && await v,
                        h
                } finally {
                    l && clearTimeout(l)
                }
            }
        ;
        return i.start = async () => {
            R(!0);
            try {
                for (; ; ) {
                    for (let l = 0; l < t.length; l++) {
                        i.baseUrl = a();
                        try {
                            Xe && console.log(`SignalR connection to: ${i.baseUrl}`),
                                await c(),
                                R(!1);
                            return
                        } catch {
                            Xe && console.log(`SignalR connection failed: ${i.baseUrl}. Trying next url.`)
                        }
                    }
                    await Bs($e)
                }
            } finally {
                (i == null ? void 0 : i.state) === "Connected" && R(!1)
            }
        }
            ,
            i
    }
}
    , $s = gt(Os).component("font-awesome-icon", Ft).use(pt()).use(tt, {
    url: Ns,
    prebuild(e, t) {
        t.timeout = Gs,
            Xs(e, Je),
            e.withHubProtocol(new st),
            e.configureLogging(it.None)
    }
});
$s.mount("#app");
export {ms as A, ce as B, Ds as C, Ve as D, ue as E, Yt as F, qs as G, ti as H, hi as I, li as J, ui as K, ai as L, Ps as M, ri as N, ni as O, mi as P, oi as Q, si as R, us as S, _ as T, fi as U, y as V, ci as W, ii as X, p as _, H as a, Q as b, Ks as c, Ee as d, $t as e, Ie as f, Qs as g, ee as h, Cs as i, z as j, Me as k, Le as l, Ke as m, xe as n, ns as o, es as p, me as q, C as r, Fe as s, ei as t, P as u, k as v, js as w, Zs as x, Us as y, Js as z};
