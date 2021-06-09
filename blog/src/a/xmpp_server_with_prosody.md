title: Create an XMPP server with Prosody compatible with Conversations and Movim
author: David Luévano
lang: en
summary: How to create an XMPP server using Prosody on a server running Nginx. This server will be compatible with at least Conversations and Movim.
tags: server
	tools
	tutorial
	english

Recently I set up an XMPP server (and a Matrix one, too) for my personal use and for friends if they want one; made one for ???[EL ELE EME](https://lmcj.xyz)???, for example. So, here are the notes on how I set up the server that is compatible with the [Conversations](https://conversations.im/) app and the [Movim](https://movim.eu/) social network. You can see my addresses in [contact](https://luevano.xyz/contact.html) and the XMPP compliance/score of the server.

One of the best resources I found that helped me a lot was [Installing and Configuring Prosody XMPP Server on Debian 9](https://community.hetzner.com/tutorials/prosody-debian9), and of course the [Arch Wiki](https://wiki.archlinux.org/title/Prosody) and the [oficial documentation](https://prosody.im/).

As with my other entries, this is under a server running Arch Linux, with the Nginx web server and Certbot certificates. And all commands here are executed as root (unless specified otherwise)

## Prerequisites

Same as with my other entries ([website](https://luevano.xyz/a/website_with_nginx.html), [mail](https://blog.luevano.xyz/a/mail_server_with_postfix.html) and [git](https://blog.luevano.xyz/a/git_server_with_cgit.html)) plus:

- **A** and (optionally) **AAA** DNS records for:
	- `xmpp`: the actual XMPP server and the file upload service.
	- `muc` (or `conference`): for multi-user chats.
	- `pubsub`: the publish-subscribe service.
	- `proxy`: a proxy in case one of the users needs it.
	- `vjud`: user directory.
- (Optionally, but recommended) the following **SRV** DNS records; make sure it is pointing to an **A** or **AAA** record (matching the records from the last point, for example):
	- `_xmpp-client._tcp.**your.domain**.` for port `5222` pointing to `xmpp.**your.domain**.`
	- `_xmpp-server._tcp.**your.domain**.` for port `5269` pointing to `xmpp.**your.domain**.`
	- `_xmpp-server._tcp.muc.**your.domain**.` for port `5269` pointing to `xmpp.**your.domain**.`
* SSL certificates for the previous subdomains; similar that with my other entries just create the appropriate `prosody.conf` (where `server_name` will be all the subdomains defined above) file and run `certbot --nginx`. You can find the example configuration file almost at the end of this entry.
- Email addresses for `admin`, `abuse`, `contact`, `security`, etc. Or use your own email for all of them, doesn't really matter much as long as you define them in the configuration and are valid, I have aliases so those emails are forwarded to me.
- Allow ports 5000, 5222, 5269, 5280 and 5281 for [Prosody](https://prosody.im/doc/ports) and, 3478 and 5349 for [Turnserver](https://webrtc.org/getting-started/turn-server) which are the defaults for `coturn`.

## Prosody

[Prosody](https://wiki.archlinux.org/title/Prosody) is an implementation of the XMPP protocol that is flexible and extensible.

Install the `prosody` package (with optional dependencies) and the `mercurial` package:

```sh
pacman -S prosody, mercurial, lua52-sec, lua52-dbi, lua52-zlib
```

We need mercurial to be able to download and update the extra modules needed to make the server compliant with `conversations.im` and `mov.im`. Go to `/var/lib/prosody`, clone the latest Prosody modules repository and prepare the directories:

```sh
cd /var/lib/prosody
hg clone https://hg.prosody.im/prosody-modules modules-available
mkdir modules-enabled
```

You can see that I follow a similar approach that I used with Nginx and the server configuration, where I have all the modules available in a directory, and make a symlink to another to keep track of what is being used. You can update the repository by running `hg pull --update` while inside the `modules-available` directory (similar to Git).

Make symbolic links to the following modules:

```
ln -s /var/lib/prosody/modules-available/MODULE_NAME /var/lib/prosody/modules-enabled/
...
```

- Modules:
	- `mod_bookmarks`
	- `mod_cache_c2s_caps`
	- `mod_checkcerts`
	- `mod_cloud_notify`
	- `mod_csi_battery_saver`
	- `mod_default_bookmarks`
	- `mod_external_services`
	- `mod_http_avatar`
	- `mod_http_pep_avatar`
	- `mod_http_upload`
	- `mod_http_upload_external`
	- `mod_idlecompat`
	- `mod_muc_limits`
	- `mod_muc_mam_hints`
	- `mod_muc_mention_notifications`
	- `mod_presence_cache`
	- `mod_pubsub_feeds`
	- `mod_pubsub_text_interface`
	- `mod_smacks`
	- `mod_strict_https`
	- `mod_vcard_muc`
	- `mod_vjud`
	- `mod_watchuntrusted`

And add other modules if needed, but these work for the apps that I mentioned. You should also change the permissions for these files:

```sh
chown -R prosody:prosody /var/lib/prosody
```

Now, configure the server by editing the `/etc/prosody/prosody.cfg.lua` file. It's a bit tricky to configure, so here is my configuration file (lines starting with `--` are comments). Make sure to change according to your domain, and maybe preferences. Read each line and each comment to know what's going on, It's easier to explain it with comments in the file itself than strip it in a lot of pieces.

And also, note that the configuration file has a "global" section and a per "virtual server"/"component" section, basically everything above all the VirtualServer/Component sections are global, and bellow each VirtualServer/Component, corresponds to that section.

```
-- important for systemd
daemonize = true
pidfile = "/run/prosody/prosody.pid"

-- or your account, not that this is an xmpp jid, not email
admins = { "admin@your.domain" }

contact_info = {
	abuse = { "mailto:abuse@your.domain", "xmpp:abuse@your.domain" };
	admin = { "mailto:admin@your.domain", "xmpp:admin@your.domain" };
	admin = { "mailto:feedback@your.domain", "xmpp:feedback@your.domain" };
	security = { "mailto:security@your.domain" };
	support = { "mailto:support@your.domain", "xmpp:support@muc.your.domain" };
}

-- so prosody look up the plugins we added
plugin_paths = { "/var/lib/prosody/modules-enabled" }

modules_enabled = {
	-- Generally required
		"roster"; -- Allow users to have a roster. Recommended ;)
		"saslauth"; -- Authentication for clients and servers. Recommended if you want to log in.
		"tls"; -- Add support for secure TLS on c2s/s2s connections
		"dialback"; -- s2s dialback support
		"disco"; -- Service discovery
	-- Not essential, but recommended
		"carbons"; -- Keep multiple clients in sync
		"pep"; -- Enables users to publish their avatar, mood, activity, playing music and more
		"private"; -- Private XML storage (for room bookmarks, etc.)
		"blocklist"; -- Allow users to block communications with other users
		"vcard4"; -- User profiles (stored in PEP)
		"vcard_legacy"; -- Conversion between legacy vCard and PEP Avatar, vcard
		"limits"; -- Enable bandwidth limiting for XMPP connections
	-- Nice to have
		"version"; -- Replies to server version requests
		"uptime"; -- Report how long server has been running
		"time"; -- Let others know the time here on this server
		"ping"; -- Replies to XMPP pings with pongs
		"register"; -- Allow users to register on this server using a client and change passwords
		"mam"; -- Store messages in an archive and allow users to access it
		"csi_simple"; -- Simple Mobile optimizations
	-- Admin interfaces
		"admin_adhoc"; -- Allows administration via an XMPP client that supports ad-hoc commands
		--"admin_telnet"; -- Opens telnet console interface on localhost port 5582
	-- HTTP modules
		"http"; -- Explicitly enable http server.
		"bosh"; -- Enable BOSH clients, aka "Jabber over HTTP"
		"websocket"; -- XMPP over WebSockets
		"http_files"; -- Serve static files from a directory over HTTP
	-- Other specific functionality
		"groups"; -- Shared roster support
		"server_contact_info"; -- Publish contact information for this service
		"announce"; -- Send announcement to all online users
		"welcome"; -- Welcome users who register accounts
		"watchregistrations"; -- Alert admins of registrations
		"motd"; -- Send a message to users when they log in
		--"legacyauth"; -- Legacy authentication. Only used by some old clients and bots.
		--"s2s_bidi"; -- not yet implemented, have to wait for v0.12
		"bookmarks";
		"checkcerts";
		"cloud_notify";
		"csi_battery_saver";
		"default_bookmarks";
		"http_avatar";
		"idlecompat";
		"presence_cache";
		"smacks";
		"strict_https";
		--"pep_vcard_avatar"; -- not compatible with this version of pep, wait for v0.12
		"watchuntrusted";
		"webpresence";
		"external_services";
	}

-- only if you want to disable some modules
modules_disabled = {
	-- "offline"; -- Store offline messages
	-- "c2s"; -- Handle client connections
	-- "s2s"; -- Handle server-to-server connections
	-- "posix"; -- POSIX functionality, sends server to background, enables syslog, etc.
}

external_services = {
	{
		type = "stun",
		transport = "udp",
		host = "proxy.your.domain",
		port = 3478
	}, {
		type = "turn",
		transport = "udp",
		host = "proxy.your.domain",
		port = 3478,
		-- you could decide this now or come back later when you install coturn
		secret = "YOUR SUPER SECRET TURN PASSWORD"
	}
}

--- general global configuration
http_ports = { 5280 }
http_interfaces = { "*", "::" }

https_ports = { 5281 }
https_interfaces = { "*", "::" }

proxy65_ports = { 5000 }
proxy65_interfaces = { "*", "::" }

http_default_host = "xmpp.your.domain"
http_external_url = "https://xmpp.your.domain/"
-- or if you want to have it somewhere else, change this
https_certificate = "/etc/prosody/certs/xmpp.your.domain.crt"

hsts_header = "max-age=31556952"

cross_domain_bosh = true
--consider_bosh_secure = true
cross_domain_websocket = true
--consider_websocket_secure = true

trusted_proxies = { "127.0.0.1", "::1", "192.169.1.1" }

pep_max_items = 10000

-- this is disabled by default, and I keep it like this, depends on you
--allow_registration = true

-- you might want this options as they are
c2s_require_encryption = true
s2s_require_encryption = true
s2s_secure_auth = false
--s2s_insecure_domains = { "insecure.example" }
--s2s_secure_domains = { "jabber.org" }

-- where the certificates are stored (/etc/prosody/certs by default)
certificates = "certs"
checkcerts_notify = 7 -- ( in days )

-- rate limits on connections to the server, these are my personal settings, because by default they were limited to something like 30kb/s
limits = {
	c2s = {
		rate = "2000kb/s";
	};
	s2sin = {
		rate = "5000kb/s";
	};
	s2sout = {
		rate = "5000kb/s";
	};
}

-- again, this could be yourself, it is a jid
unlimited_jids = { "admin@your.domain" }

authentication = "internal_hashed"

-- if you don't want to use sql, change it to internal and comment the second line
-- since this is optional, i won't describe how to setup mysql or setup the user/database, that would be out of the scope for this entry
storage = "sql"
sql = { driver = "MySQL", database = "prosody", username = "prosody", password = "PROSODY USER SECRET PASSWORD", host = "localhost" }

archive_expires_after = "4w" -- configure message archive
max_archive_query_results = 20;
mam_smart_enable = true
default_archive_policy = "roster" -- archive only messages from users who are in your roster

-- normally you would like at least one log file of certain level, but I keep all of them, the default is only the info = "*syslog" one
log = {
	info = "*syslog";
	warn = "prosody.warn";
	error = "prosody.err";
	debug = "prosody.debug";
	-- "*console"; -- Needs daemonize=false
}

-- cloud_notify
push_notification_with_body = false -- Whether or not to send the message body to remote pubsub node
push_notification_with_sender = false -- Whether or not to send the message sender to remote pubsub node
push_max_errors = 5 -- persistent push errors are tolerated before notifications for the identifier in question are disabled
push_max_devices = 5 -- number of allowed devices per user

-- by default every user on this server will join these muc rooms
default_bookmarks = {
	{ jid = "room@muc.your.domain", name = "The Room" };
	{ jid = "support@muc.your.domain", name = "Support Room" };
}

-- could be your jid
untrusted_fail_watchers = { "admin@your.domain" }
untrusted_fail_notification = "Establishing a secure connection from $from_host to $to_host failed. Certificate hash: $sha1. $errors"

----------- Virtual hosts -----------
VirtualHost "your.domain"
	name = "Prosody"
	http_host = "xmpp.your.domain"

disco_items = {
	{ "your.domain", "Prosody" };
	{ "muc.your.domain", "MUC Service" };
	{ "pubsub.your.domain", "Pubsub Service" };
	{ "proxy.your.domain", "SOCKS5 Bytestreams Service" };
	{ "vjud.your.domain", "User Directory" };
}


-- Multi-user chat
Component "muc.your.domain" "muc"
	name = "MUC Service"
	modules_enabled = {
		--"bob"; -- not compatible with this version of Prosody
		"muc_limits";
		"muc_mam"; -- message archive in muc, again, a placeholder
		"muc_mam_hints";
		"muc_mention_notifications";
		"vcard_muc";
	}

	restrict_room_creation = false

	muc_log_by_default = true
	muc_log_presences = false
	log_all_rooms = false
	muc_log_expires_after = "1w"
	muc_log_cleanup_interval = 4 * 60 * 60


-- Upload
Component "xmpp.your.domain" "http_upload"
	name = "Upload Service"
	http_host= "xmpp.your.domain"
	-- you might want to change this, these are numbers in bytes, so 10MB and 100MB respectively
	http_upload_file_size_limit = 1024*1024*10
	http_upload_quota = 1024*1024*100


-- Pubsub
Component "pubsub.your.domain" "pubsub"
	name = "Pubsub Service"
	pubsub_max_items = 10000
	modules_enabled = {
		"pubsub_feeds";
		"pubsub_text_interface";
	}

	-- personally i don't have any feeds configured
	feeds = {
		-- The part before = is used as PubSub node
		--planet_jabber = "http://planet.jabber.org/atom.xml";
		--prosody_blog = "http://blog.prosody.im/feed/atom.xml";
	}


-- Proxy
Component "proxy.your.domain" "proxy65"
	name = "SOCKS5 Bytestreams Service"
	proxy65_address = "proxy.your.domain"


-- Vjud, user directory
Component "vjud.your.domain" "vjud"
	name = "User Directory"
	vjud_mode = "opt-in"
```

You ???HAVE??? to read all of the configuration file, because there are a lot of things that you need to change to make it work with your server/domain. Test the configuration file with:

```sh
luac5.2 -p /etc/prosody/prosody.cfg.lua
```

Notice that by default `prosody` will look up certificates that look like `sub.your.domain`, but if you get the certificates as myself, you'll have a single certificate for all subdomains, and by default it is in `/etc/letsencrypt/live`, which has some strict permissions. So, to import them you can run:

```sh
prosodyctl --root cert import /etc/letsencrypt/live
```

Ignore the complaining about not finding the subdomain certificates and note that you will have to run that command on each certificate renewal, to automate this, add the `--deploy-hook` flag to your automated Certbot renewal system; for me it's a `systemd` timer with the following `certbot.service`:

```ini
[Unit]
Description=Let's Encrypt renewal

[Service]
Type=oneshot
ExecStart=/usr/bin/certbot renew --quiet --agree-tos --deploy-hook "systemctl reload nginx.service && prosodyctl --root cert import /etc/letsencrypt/live"
```

And if you don't have it already, the `certbot.timer`:

```ini
[Unit]
Description=Twice daily renewal of Let's Encrypt's certificates

[Timer]
OnCalendar=0/12:00:00
RandomizedDelaySec=1h
Persistent=true

[Install]
WantedBy=timers.target
```

Also, go to the `certs` directory and make the appropriate symbolic links:

```sh
cd /etc/prosody/certs
ln -s your.domain.crt SUBDOMAIN.your.domain.crt
ln -s your.domain.key SUBDOMAIN.your.domain.key
...
```

That's basically all the configuration that needs Prosody itself, but we still have to configure Nginx and Coturn before starting/enabling the `prosody` service.

## Nginx configuration file

Since this is not an ordinary configuration file I'm going to describe this too. Your `prosody.conf` file should have the following location blocks under the main server block (the one that listens to HTTPS):

```nginx
# HTTPS server block
server {
	root /var/www/prosody/;
	server_name xmpp.luevano.xyz muc.luevano.xyz pubsub.luevano.xyz vjud.luevano.xyz proxy.luevano.xyz;
	index index.html;

	# for extra https discovery (XEP-0256)
	location /.well-known/acme-challenge {
		allow all;
	}

	# bosh specific
	location /http-bind {
		proxy_pass  https://localhost:5281/http-bind;

		proxy_set_header Host $host;
		proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
		proxy_set_header X-Forwarded-Proto $scheme;
		proxy_buffering off;
		tcp_nodelay on;
	}

	# websocket specific
	location /xmpp-websocket {
		proxy_pass https://localhost:5281/xmpp-websocket;

		proxy_http_version 1.1;
		proxy_set_header Connection "Upgrade";
		proxy_set_header Upgrade $http_upgrade;

		proxy_set_header Host $host;
		proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
		proxy_set_header X-Forwarded-Proto $scheme;
		proxy_read_timeout 900s;
	}

	# general proxy
	location / {
		proxy_pass https://localhost:5281;

		proxy_set_header Host $host;
		proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
		proxy_set_header X-Forwarded-Proto $scheme;
		proxy_set_header X-Real-IP $remote_addr;
	}
	...
	# Certbot stuff
}
# HTTP server block (the one that certbot creates)
server {
	...
}
```

Also, you need to add the following to your actual `your.domain` (this cannot be a subdomain) configuration file:

```nginx
server {
	...
	location /.well-known/host-meta {
		default_type 'application/xrd+xml';
		add_header Access-Control-Allow-Origin '*' always;
	}

	location /.well-known/host-meta.json {
		default_type 'application/jrd+json';
		add_header Access-Control-Allow-Origin '*' always;
	}
	...
}
```

And you will need the following `host-meta` and `host-meta.json` files inside the `.well-known/acme-challenge` directory for `your.domain` (following my nomenclature: `/var/www/yourdomaindir/.well-known/acme-challenge/`).

For `host-meta` file:

```xml
<?xml version='1.0' encoding='utf-8'?>
<XRD xmlns='http://docs.oasis-open.org/ns/xri/xrd-1.0'>
	<Link rel="urn:xmpp:alt-connections:xbosh"
		href="https://xmpp.your.domain:5281/http-bind" />
	<Link rel="urn:xmpp:alt-connections:websocket"
		href="wss://xmpp.your.domain:5281/xmpp-websocket" />
</XRD>
```

And `host-meta.json` file:

```json
{
	"links": [
		{
			"rel": "urn:xmpp:alt-connections:xbosh",
				"href": "https://xmpp.your.domain:5281/http-bind"
		},
		{
			"rel": "urn:xmpp:alt-connections:websocket",
				"href": "wss://xmpp.your.domain:5281/xmpp-websocket"
		}
	]
}
```

Remember to have your `prosody.conf` file symlinked (or discoverable by Nginx) to the `sites-enabled` directory. You can now restart your `nginx` service (and test the configuration, optionally):

```sh
nginx -t
systemctl restart nginx.service
```

## Coturn

[Coturn](https://github.com/coturn/coturn) is the implementation of TURN and STUN server, which in general is for (at least in the XMPP world) voice support and external service discovery.

Install the `coturn` package:

```sh
pacman -S coturn
```

You can modify the configuration file (located at `/etc/turnserver/turnserver.conf`) as desired, but at least you need to make the following changes (uncomment or edit):

```
use-auth-secret
realm=proxy.your.domain
static-auth-secret=YOUR SUPER SECRET TURN PASSWORD
```

I'm sure there is more configuration to be made, like using SQL to store data and whatnot, but for now this is enough for me. Note that you may not have some functionality that's needed to create dynamic users to use the TURN server, and to be honest I haven't tested this since I don't use this feature in my XMPP clients, but if it doesn't work, or you know of an error or missing configuration don't hesitate to [contact me](https://luevano.xyz/contact.html).

Start/enable the `turnserver` service:

```sh
systemctl start turnserver.service
systemctl enable turnserver.service
```

You can test if your TURN server works at [Trickle ICE](https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/). You may need to add a user in the `turnserver.conf` to test this.

## Wrapping up

At this point you should have a working XMPP server, start/enable the `prosody` service now:

```
systemctl start prosody.service
systemctl enable prosody.service
```

And you can add your first user with the `prosodyctl` command (it will prompt you to add a password):

```
prosodyctl adduser user@your.domain
```

You may want to add a `compliance` user, so you can check if your server is set up correctly. To do so, go to [XMPP Compliance Tester](https://compliance.conversations.im/add/) and enter the `compliance` user credentials. It should have similar compliance score to mine:

<a href='https://compliance.conversations.im/server/luevano.xyz'><img src='https://compliance.conversations.im/badge/luevano.xyz'></a>

Additionally, you can test the security of your server in [IM Observatory](https://xmpp.net/index.php), here you only need to specify your `domain.name` (not `xmpp.domain.name`, if you set up the **SRV** DNS records correctly). Again, it should have a similar score to mine:

<a href='https://xmpp.net/result.php?domain=luevano.xyz&amp;type=client'><img src='https://xmpp.net/badge.php?domain=luevano.xyz' alt='xmpp.net score' /></a>

You can now log in into your XMPP client of choice, if it asks for the server it should be `xmpp.your.domain` (or `your.domain` for some clients) and your login credentials `you@your.domain` and the password you chose (which you can change in most clients).

That's it, send me a message <a href="xmpp:david@luevano.xyz">david@luevano.xyz</a> if you were able to set up the server successfully.
