(function () {
    const navbar = document.getElementById("navbar");
    const toggle = document.querySelector(".nav-toggle");
    const links = document.getElementById("navLinks");
    const yearEl = document.getElementById("year");
    const isHome = document.body.classList.contains("page-home");
    const main = document.getElementById("main");
    const footer = document.querySelector(".footer");

    if (yearEl) yearEl.textContent = String(new Date().getFullYear());

    if (navbar && isHome) {
        let ticking = false;
        function updateNav() {
            if (window.scrollY > 50) navbar.classList.add("scrolled");
            else navbar.classList.remove("scrolled");
            ticking = false;
        }
        window.addEventListener("scroll", function () {
            if (!ticking) {
                window.requestAnimationFrame(updateNav);
                ticking = true;
            }
        }, { passive: true });
        updateNav();
    }

    if (toggle && links) {
        function getFocusableInMenu() {
            return Array.prototype.slice.call(
                links.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])')
            ).filter(function (el) {
                return !el.hasAttribute("disabled") && el.offsetParent !== null;
            });
        }

        function setBackgroundInert(open) {
            [main, footer].forEach(function (el) {
                if (!el) return;
                if (open) el.setAttribute("inert", "");
                else el.removeAttribute("inert");
            });
        }

        function setMenuOpen(open) {
            links.classList.toggle("open", open);
            toggle.setAttribute("aria-expanded", open ? "true" : "false");
            toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
            setBackgroundInert(open);
            document.body.classList.toggle("nav-open", open);
        }

        function closeMenu(returnFocus) {
            setMenuOpen(false);
            if (returnFocus) toggle.focus();
        }

        toggle.addEventListener("click", function () {
            const willOpen = !links.classList.contains("open");
            setMenuOpen(willOpen);
            if (willOpen) {
                const focusables = getFocusableInMenu();
                if (focusables[0]) focusables[0].focus();
            }
        });

        links.querySelectorAll("a").forEach(function (link) {
            link.addEventListener("click", function () {
                closeMenu(false);
            });
        });

        document.addEventListener("click", function (event) {
            if (!toggle.contains(event.target) && !links.contains(event.target)) {
                closeMenu(false);
            }
        });

        document.addEventListener("keydown", function (event) {
            if (!links.classList.contains("open")) return;

            if (event.key === "Escape") {
                closeMenu(true);
                return;
            }

            if (event.key !== "Tab") return;

            const focusables = getFocusableInMenu();
            if (!focusables.length) return;

            const first = focusables[0];
            const last = focusables[focusables.length - 1];
            const active = document.activeElement;

            if (event.shiftKey) {
                if (active === first || active === toggle) {
                    event.preventDefault();
                    last.focus();
                }
            } else if (active === last) {
                event.preventDefault();
                first.focus();
            }
        });
    }

    const revealEls = document.querySelectorAll(".reveal");
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
        revealEls.forEach(function (el) { el.classList.add("in"); });
    } else if ("IntersectionObserver" in window) {
        const io = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add("in");
                    io.unobserve(entry.target);
                }
            });
        }, { threshold: 0.15 });
        revealEls.forEach(function (el) { io.observe(el); });
    } else {
        revealEls.forEach(function (el) { el.classList.add("in"); });
    }

    /* Lightbox — native <dialog>, no external deps */
    (function initLightbox() {
        const triggers = document.querySelectorAll("[data-lightbox]");
        if (!triggers.length || typeof HTMLDialogElement === "undefined") return;

        const dialog = document.createElement("dialog");
        dialog.className = "lightbox";
        dialog.innerHTML =
            '<div class="lightbox-panel">' +
                '<button type="button" class="lightbox-close" aria-label="Close">&times;</button>' +
                '<figure class="lightbox-figure"><img alt=""></figure>' +
                '<div class="lightbox-meta">' +
                    '<p class="lightbox-title" id="lightbox-title"></p>' +
                    '<div class="lightbox-actions" hidden>' +
                        '<a class="btn btn-primary lightbox-inquire" href="#">Inquire by email</a>' +
                    '</div>' +
                '</div>' +
            '</div>';
        document.body.appendChild(dialog);

        const img = dialog.querySelector(".lightbox-figure img");
        const titleEl = dialog.querySelector(".lightbox-title");
        const actions = dialog.querySelector(".lightbox-actions");
        const inquire = dialog.querySelector(".lightbox-inquire");
        const closeBtn = dialog.querySelector(".lightbox-close");
        let lastTrigger = null;

        function largestFromSrcset(el) {
            const srcset = el.getAttribute("srcset");
            if (!srcset) return el.currentSrc || el.getAttribute("src") || "";
            let bestUrl = "";
            let bestW = -1;
            srcset.split(",").forEach(function (part) {
                const bits = part.trim().split(/\s+/);
                const url = bits[0];
                const w = bits[1] ? parseInt(bits[1], 10) : 0;
                if (url && w >= bestW) {
                    bestW = w;
                    bestUrl = url;
                }
            });
            return bestUrl || el.currentSrc || el.getAttribute("src") || "";
        }

        function withAvifFallback(url) {
            if (!url || !/\.webp$/i.test(url)) return { src: url, fallback: "" };
            return { src: url.replace(/\.webp$/i, ".avif"), fallback: url };
        }

        function resolveImage(trigger) {
            const explicit = trigger.getAttribute("data-lightbox");
            if (explicit && explicit !== "true" && explicit !== "") {
                const preferred = withAvifFallback(explicit);
                return {
                    src: preferred.src,
                    fallback: preferred.fallback,
                    alt: trigger.getAttribute("data-lightbox-alt") || ""
                };
            }
            const media = trigger.querySelector("img") || (trigger.tagName === "IMG" ? trigger : null);
            if (!media) return { src: "", fallback: "", alt: "" };
            const fromSrcset = withAvifFallback(largestFromSrcset(media));
            return {
                src: fromSrcset.src,
                fallback: fromSrcset.fallback,
                alt: trigger.getAttribute("data-lightbox-alt") || media.getAttribute("alt") || ""
            };
        }

        function resolveTitle(trigger) {
            const custom = trigger.getAttribute("data-lightbox-title");
            if (custom) return custom;
            const h3 = trigger.querySelector("h3") ||
                (trigger.closest(".product") && trigger.closest(".product").querySelector("h3")) ||
                (trigger.closest(".print-item") && trigger.closest(".print-item").querySelector(".print-caption"));
            if (h3) return h3.textContent.trim();
            const imgEl = trigger.querySelector("img") || (trigger.tagName === "IMG" ? trigger : null);
            return (imgEl && imgEl.getAttribute("alt")) || "CreativeKaurner";
        }

        function openLightbox(trigger) {
            const resolved = resolveImage(trigger);
            if (!resolved.src) return;

            lastTrigger = trigger;
            img.onerror = null;
            if (resolved.fallback) {
                img.onerror = function () {
                    img.onerror = null;
                    img.src = resolved.fallback;
                };
            }
            img.src = resolved.src;
            img.alt = resolved.alt;
            const title = resolveTitle(trigger);
            titleEl.textContent = title;
            dialog.setAttribute("aria-labelledby", "lightbox-title");
            dialog.removeAttribute("aria-label");

            const mailto = trigger.getAttribute("data-lightbox-mailto") ||
                (trigger.matches('a[href^="mailto:"]') ? trigger.getAttribute("href") : "");
            if (mailto) {
                inquire.href = mailto;
                actions.hidden = false;
            } else {
                inquire.removeAttribute("href");
                actions.hidden = true;
            }

            dialog.showModal();
            closeBtn.focus();
        }

        function closeLightbox() {
            if (!dialog.open) return;
            dialog.close();
            img.removeAttribute("src");
            if (lastTrigger && typeof lastTrigger.focus === "function") {
                lastTrigger.focus();
            }
            lastTrigger = null;
        }

        triggers.forEach(function (trigger) {
            if (trigger.tagName !== "A" && trigger.tagName !== "BUTTON") {
                if (!trigger.hasAttribute("tabindex")) trigger.setAttribute("tabindex", "0");
                if (!trigger.hasAttribute("role")) trigger.setAttribute("role", "button");
                if (!trigger.hasAttribute("aria-label")) {
                    const label = resolveTitle(trigger);
                    trigger.setAttribute("aria-label", "Enlarge image: " + label);
                }
            }

            trigger.addEventListener("click", function (event) {
                if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                event.preventDefault();
                openLightbox(trigger);
            });

            trigger.addEventListener("keydown", function (event) {
                if (trigger.tagName === "A" || trigger.tagName === "BUTTON") return;
                if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    openLightbox(trigger);
                }
            });
        });

        closeBtn.addEventListener("click", closeLightbox);

        dialog.addEventListener("click", function (event) {
            if (event.target === dialog) closeLightbox();
        });

        dialog.addEventListener("cancel", function (event) {
            event.preventDefault();
            closeLightbox();
        });
    })();
})();
