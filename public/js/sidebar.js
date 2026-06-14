(function() {
    if (localStorage.getItem('sidebarCollapsed') === 'true') {
        document.getElementById('sidebar').classList.add('collapsed');
        document.body.classList.add('sidebar-collapsed');
        const toggleBtn = document.querySelector('.sidebar-toggle-btn i');
        if (toggleBtn) {
            toggleBtn.classList.remove('bi-chevron-left');
            toggleBtn.classList.add('bi-list');
        }
    }
    document.documentElement.classList.remove('sc');
})();

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const body = document.body;
    const toggleBtn = document.querySelector('.sidebar-toggle-btn i');
    sidebar.classList.toggle('collapsed');
    body.classList.toggle('sidebar-collapsed');
    if (toggleBtn) {
        if (sidebar.classList.contains('collapsed')) {
            toggleBtn.classList.remove('bi-chevron-left');
            toggleBtn.classList.add('bi-list');
        } else {
            toggleBtn.classList.remove('bi-list');
            toggleBtn.classList.add('bi-chevron-left');
        }
    }
    localStorage.setItem('sidebarCollapsed', sidebar.classList.contains('collapsed'));
}

function toggleSubmenu(header, e) {
    e.stopPropagation();
    const parent = header.closest('.menu-parent');
    const sidebar = document.getElementById('sidebar');

    if (sidebar.classList.contains('collapsed')) {
        const wasOpen = parent.classList.contains('open');
        document.querySelectorAll('.menu-parent.open').forEach(el => {
            el.classList.remove('open');
        });
        if (!wasOpen) {
            parent.classList.add('open');
        }
        return;
    }

    parent.classList.toggle('open');
}

document.addEventListener('click', function(e) {
    if (!e.target.closest('.sidebar')) {
        document.querySelectorAll('.menu-parent.open').forEach(el => {
            el.classList.remove('open');
        });
    }
});

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        document.querySelectorAll('.menu-parent.open').forEach(el => {
            el.classList.remove('open');
        });
    }
});

document.addEventListener('keydown', function(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const modal = new bootstrap.Modal(document.getElementById('commandPaletteModal'));
        modal.show();
    }
});

document.addEventListener('DOMContentLoaded', function() {
    const modal = document.getElementById('commandPaletteModal');
    if (modal) {
        modal.addEventListener('shown.bs.modal', function () {
            document.getElementById('commandSearchInput').focus();
        });

        document.getElementById('commandSearchInput').addEventListener('input', function(e) {
            const term = e.target.value.toLowerCase();
            const resultsContainer = document.getElementById('commandResults');
            const links = resultsContainer.querySelectorAll('a');
            links.forEach(link => {
                const text = link.textContent.toLowerCase();
                link.style.display = text.includes(term) ? 'flex' : 'none';
            });
        });
    }
});
