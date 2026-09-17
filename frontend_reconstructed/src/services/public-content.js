import { state } from "../context/state.js";
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:709804-710145 (A_). */
function createPublicItem(e, t, r, a, n = "") {
  const i = {
    news: {
      title: t,
      date: r,
      detail: a,
      image: n,
    },
    activities: {
      title: t,
      date: r,
      detail: a,
      image: n,
    },
    programs: {
      title: t,
      detail: a,
      image: n,
    },
    teachers: {
      name: t,
      role: r,
      bio: a,
      image: n,
    },
    mediaItems: {
      title: t,
      type: r || "صورة",
      detail: a,
      image: n,
    },
    branches: {
      title: t,
      address: r,
      detail: a,
    },
  }[e];
  if (i) {
    state.publicContent[e] =
      e === "teachers" ? [...state.publicContent[e], i] : [i, ...state.publicContent[e]];
  }
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:710145-710549 (k_). */
function updatePublicItem(e, t, r, a, n, i = "") {
  const s = state.publicContent[e]?.[t];
  if (!s) return;
  const o = {
    news: {
      title: r,
      date: a,
      detail: n,
      image: i || s.image || "",
    },
    activities: {
      title: r,
      date: a,
      detail: n,
      image: i || s.image || "",
    },
    programs: {
      title: r,
      detail: n,
      image: i || s.image || "",
    },
    teachers: {
      name: r,
      role: a,
      bio: n,
      image: i || s.image || "",
    },
    mediaItems: {
      title: r,
      type: a || "صورة",
      detail: n,
      image: i || s.image || "",
    },
    branches: {
      title: r,
      address: a,
      detail: n,
    },
  }[e];
  if (o) {
    state.publicContent[e][t] = o;
  }
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:710549-710679 (__). */
function movePublicItem(e, t, r) {
  const a = state.publicContent[e];
  if (!Array.isArray(a)) return;
  const n = r === "up" ? t - 1 : t + 1;
  if (!(n < 0 || n >= a.length)) {
    [a[t], a[n]] = [a[n], a[t]];
  }
}
export /* HIGH CONFIDENCE behavior; INFERRED name/boundary. Evidence: legacyApp-Cum0wzIn.js:710679-710851 (td). */
function optionalFileDataUrl(e) {
  return !(e instanceof File) || !e.size
    ? Promise.resolve("")
    : new Promise((t, r) => {
        const reader = new FileReader();
        reader.onload = () => t(reader.result);
        reader.onerror = r;
        reader.readAsDataURL(e);
      });
}
