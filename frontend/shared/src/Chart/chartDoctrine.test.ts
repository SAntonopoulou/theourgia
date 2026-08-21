import { describe, expect, it } from "vitest";

import type { ChartPlacementRead, ChartResponse } from "../api/types.js";
import {
  antiscion,
  aspectBetween,
  contraAntiscion,
  dignitiesOf,
  houseOfLongitude,
  houseQuarter,
  lotOfFortune,
  lotOfSpirit,
  readChart,
  sectFromChart,
  signNameOf,
} from "./chartDoctrine.js";

function placement(over: Partial<ChartPlacementRead> & { body_id: string }): ChartPlacementRead {
  return {
    body_name: over.body_id,
    glyph: "",
    tropical_longitude: 0,
    tropical_sign: "Aries",
    house: 1,
    is_retrograde: false,
    ...over,
  };
}

function chart(over: Partial<ChartResponse>): ChartResponse {
  return {
    instant: "2026-08-21T12:00:00Z",
    julian_day: 0,
    latitude: 0,
    longitude: 0,
    zodiac: "tropical",
    house_system: "whole-sign",
    placements: [],
    houses: { cusps: Array.from({ length: 12 }, (_, i) => i * 30), ascendant: 0, midheaven: 270 },
    aspects: [],
    attribution: "",
    ...over,
  };
}

describe("essential dignities, against the phone's tables", () => {
  it("the Sun at 15° Leo by day: in domicile and triplicity", () => {
    const d = dignitiesOf("sun", 135, "diurnal");
    expect(d).not.toBeNull();
    expect(d?.held).toEqual(expect.arrayContaining(["domicile", "triplicity"]));
    expect(d?.debilities).toEqual([]);
    expect(d?.peregrine).toBe(false);
  });

  it("Saturn at 5° Libra by day: exaltation, triplicity, and its own bound", () => {
    const d = dignitiesOf("saturn", 185, "diurnal");
    expect(d?.held).toEqual(expect.arrayContaining(["exaltation", "triplicity", "bound"]));
    expect(d?.exaltationLord).toBe("saturn");
    expect(d?.boundLord).toBe("saturn");
  });

  it("Mars at 10° Cancer: in fall, opposite its Capricorn exaltation", () => {
    const d = dignitiesOf("mars", 100, "diurnal");
    expect(d?.debilities).toContain("fall");
    expect(d?.held).toEqual([]);
    expect(d?.peregrine).toBe(false);
  });

  it("the Moon at 25° Gemini: a stranger — peregrine", () => {
    const d = dignitiesOf("moon", 85, "diurnal");
    expect(d?.held).toEqual([]);
    expect(d?.debilities).toEqual([]);
    expect(d?.peregrine).toBe(true);
  });

  it("triplicity turns with the sect: fire's night ruler is Jupiter", () => {
    expect(dignitiesOf("jupiter", 5, "nocturnal")?.held).toContain("triplicity");
    expect(dignitiesOf("jupiter", 5, "diurnal")?.held).not.toContain("triplicity");
  });

  it("bears no dignity for anything but the seven", () => {
    expect(dignitiesOf("pluto", 100, "diurnal")).toBeNull();
    expect(dignitiesOf("fortune", 100, "diurnal")).toBeNull();
  });
});

describe("antiscia", () => {
  it("mirrors across the solstitial axis: 15° Aries → 15° Virgo", () => {
    const a = antiscion(15);
    expect(a).toBe(165);
    expect(signNameOf(a)).toBe("Virgo");
  });

  it("contra-antiscion mirrors across the equinox: 15° Aries → 15° Pisces", () => {
    const c = contraAntiscion(15);
    expect(c).toBe(345);
    expect(signNameOf(c)).toBe("Pisces");
  });
});

describe("sect and lots", () => {
  it("reads sect from the Sun's house — 7–12 is day", () => {
    expect(sectFromChart(chart({ placements: [placement({ body_id: "sun", house: 10 })] }))).toBe(
      "diurnal",
    );
    expect(sectFromChart(chart({ placements: [placement({ body_id: "sun", house: 1 })] }))).toBe(
      "nocturnal",
    );
  });

  it("Fortune is the lunar lot by day, Spirit the solar — and they swap by night", () => {
    // asc 0, sun 10, moon 100.
    expect(lotOfFortune(0, 10, 100, "diurnal")).toBe(90); // asc + moon − sun
    expect(lotOfSpirit(0, 10, 100, "diurnal")).toBe(270); // asc + sun − moon (normalised)
    // By night the formulae exchange.
    expect(lotOfFortune(0, 10, 100, "nocturnal")).toBe(270);
    expect(lotOfSpirit(0, 10, 100, "nocturnal")).toBe(90);
  });
});

describe("houses", () => {
  it("names the quarter of each house", () => {
    expect(houseQuarter(1)).toBe("angular");
    expect(houseQuarter(2)).toBe("succedent");
    expect(houseQuarter(3)).toBe("cadent");
    expect(houseQuarter(10)).toBe("angular");
  });

  it("places a longitude in the right whole-sign house", () => {
    const cusps = Array.from({ length: 12 }, (_, i) => i * 30);
    expect(houseOfLongitude(5, cusps)).toBe(1);
    expect(houseOfLongitude(95, cusps)).toBe(4);
    expect(houseOfLongitude(355, cusps)).toBe(12);
  });
});

describe("aspects", () => {
  it("finds an aspect in either order", () => {
    const aspects = [{ body_a: "sun", body_b: "moon", kind: "square" as const, orb: 0.5 }];
    expect(aspectBetween(aspects, "moon", "sun")?.kind).toBe("square");
    expect(aspectBetween(aspects, "sun", "mars")).toBeNull();
  });
});

describe("the whole reading", () => {
  it("assembles sect, lots and dignified bodies from a response", () => {
    const c = chart({
      placements: [
        placement({ body_id: "sun", house: 10, tropical_longitude: 135 }),
        placement({ body_id: "moon", house: 3, tropical_longitude: 85 }),
        placement({ body_id: "saturn", house: 7, tropical_longitude: 185 }),
      ],
    });
    const reading = readChart(c);
    expect(reading.sect).toBe("diurnal");
    expect(reading.sectLight).toBe("sun");
    expect(reading.greaterBenefic).toBe("jupiter");
    expect(reading.worseMalefic).toBe("mars");
    expect(reading.lots).not.toBeNull();
    expect(reading.bodies).toHaveLength(3);
    expect(reading.bodies[0]?.dignities?.held).toContain("domicile");
    expect(reading.houses).toHaveLength(12);
  });
});
