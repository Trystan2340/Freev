// ── Fix email : reconstruit le mailto en JS (contourne Cloudflare) ────
        (function() {
            var u = 'freevunited';
            var d = 'gmail.com';
            var e = u + '\u0040' + d;
            var m = 'mailto:' + e;
            document.querySelectorAll('.email-link').forEach(function(a) {
                a.href = m;
            });
            document.querySelectorAll('.email-text').forEach(function(a) {
                a.textContent = e;
            });
        })();
