/* KineSys — Menu Dropdown 1.0.0
 * Extraído de script-1.18.0.js sem alterar contratos públicos ou comportamento.
 */
(function instalarMenuDropdownKineSys(){
    'use strict';

    let menuTimeout = null;

    function ajustarAlturaMenuDropdown() {
        const dropdown = document.getElementById('dropdownContent');
        const container = document.getElementById('menuDropdown');
        if (!dropdown || !container) return;

        if (document.getElementById('ks_sidebar')?.contains(dropdown)) {
            dropdown.style.removeProperty('max-height');
            dropdown.classList.remove('kds-scroll-contained');
            return;
        }

        const rect = container.getBoundingClientRect();
        const margem = 12;
        const disponivel = Math.max(160, window.innerHeight - rect.bottom - margem);
        dropdown.style.maxHeight = `${disponivel}px`;
        dropdown.classList.add('kds-scroll-contained');
    }

    function toggleMenu(show) {
        const dropdown = document.getElementById('dropdownContent');
        if (!dropdown) return;
        if (show === undefined) {
            dropdown.classList.toggle('show');
        } else if (show) {
            dropdown.classList.add('show');
        } else {
            dropdown.classList.remove('show');
        }
        if (dropdown.classList.contains('show')) {
            requestAnimationFrame(ajustarAlturaMenuDropdown);
        }
    }

    function fecharMenu() {
        if (menuTimeout) {
            clearTimeout(menuTimeout);
            menuTimeout = null;
        }
        toggleMenu(false);
    }

    function abrirMenu() {
        if (menuTimeout) {
            clearTimeout(menuTimeout);
            menuTimeout = null;
        }
        toggleMenu(true);
    }

    document.addEventListener('DOMContentLoaded', function() {
        const menuToggle = document.getElementById('menuToggle');
        const dropdown = document.getElementById('dropdownContent');
        const container = document.getElementById('menuDropdown');

        if (menuToggle) {
            menuToggle.addEventListener('mouseenter', function() {
                if (menuTimeout) {
                    clearTimeout(menuTimeout);
                    menuTimeout = null;
                }
                abrirMenu();
            });
            menuToggle.addEventListener('click', function(e) {
                e.stopPropagation();
                toggleMenu();
            });
        }

        if (dropdown) {
            dropdown.addEventListener('mouseenter', function() {
                if (menuTimeout) {
                    clearTimeout(menuTimeout);
                    menuTimeout = null;
                }
                abrirMenu();
            });
            dropdown.addEventListener('mouseleave', function() {
                if (menuTimeout) clearTimeout(menuTimeout);
                menuTimeout = setTimeout(function() {
                    fecharMenu();
                }, 200);
            });
        }

        if (container) {
            container.addEventListener('mouseleave', function() {
                if (menuTimeout) clearTimeout(menuTimeout);
                menuTimeout = setTimeout(function() {
                    fecharMenu();
                }, 300);
            });
        }

        document.addEventListener('click', function(e) {
            if (container && !container.contains(e.target)) {
                fecharMenu();
            }
        });

        window.addEventListener('resize', function() {
            if (dropdown && dropdown.classList.contains('show')) ajustarAlturaMenuDropdown();
        }, { passive: true });
    });
})();