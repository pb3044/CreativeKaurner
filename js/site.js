(function () {
    const navbar = document.getElementById("navbar");
    const toggle = document.querySelector(".nav-toggle");
    const links = document.getElementById("navLinks");
    const yearEl = document.getElementById("year");
    const isHome = document.body.classList.contains("page-home");

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
        function setMenuOpen(open) {
            links.classList.toggle("open", open);
            toggle.setAttribute("aria-expanded", open ? "true" : "false");
            toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
        }

        function closeMenu(returnFocus) {
            setMenuOpen(false);
            if (returnFocus) toggle.focus();
        }

        toggle.addEventListener("click", function () {
            setMenuOpen(!links.classList.contains("open"));
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
            if (event.key === "Escape" && links.classList.contains("open")) {
                closeMenu(true);
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
        dialog.setAttribute("aria-label", "Enlarged image");
        dialog.innerHTML =
            '<div class="lightbox-panel">' +
                '<button type="button" class="lightbox-close" aria-label="Close">&times;</button>' +
                '<figure class="lightbox-figure"><img alt=""></figure>' +
                '<div class="lightbox-meta">' +
                    '<p class="lightbox-title"></p>' +
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

        function resolveImage(trigger) {
            const explicit = trigger.getAttribute("data-lightbox");
            if (explicit && explicit !== "true" && explicit !== "") {
                return {
                    src: explicit,
                    alt: trigger.getAttribute("data-lightbox-alt") || ""
                };
            }
            const media = trigger.querySelector("img") || (trigger.tagName === "IMG" ? trigger : null);
            if (!media) return { src: "", alt: "" };
            return {
                src: largestFromSrcset(media),
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
            img.src = resolved.src;
            img.alt = resolved.alt;
            titleEl.textContent = resolveTitle(trigger);

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
