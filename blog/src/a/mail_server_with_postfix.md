# Create a Mail server with Postfix, Dovecot, Spamassassin and OpenDKIM

The entry is going to be long because it's a *tedious* process. This is also based on [Luke Smith's script](https://github.com/LukeSmithxyz/emailwiz), but adapted to Arch Linux (his script works on debian-based distributions). This entry is mostly so I can record all the notes required while I'm in the process of installing/configuring the mail server on a new VPS of mine; also I'm going to be writing a script that does everything in one go, that will be hosted in [here](https://git.luevano.xyz/server_scripts.git).

This configuration works for local users (users that appear in `/etc/passwd`), and does not use any type of SQL. And note that most if not all commands executed here are run with root privileges.

## Prerequisites

Basically the same as with the [website with Nginx and Certbot](https://blog.luevano.xyz/a/website_with_nginx.html):

* A domain name. Got mine on [Epik](https://www.epik.com/?affid=da5ne9ru4) (affiliate link, btw).
	* Later we'll be adding some **MX**  and **TXT** records.
	* I also recommend to add a **CNAME** ("mail" and "www.mail") for SSL certificates.
* A VPS or somewhere else to host. I'm using [Vultr](https://www.vultr.com/?ref=8732849) (also an affiliate link).
	* Also `ssh` configured.
	* Ports 25, 587 (SMTP), 465 (SMTPS), 143 (IMAP) and 993 (IMAPS) open on the firewall (I use `ufw`).

## Postfix

Install the `postfix` package:

```sh
pacman -S postfix
```

We have two main files to configure (inside `/etc/postfix`): `master.cf` ([master(5)](https://man.archlinux.org/man/master.5)) and `main.cf` ([postconf(5)](https://man.archlinux.org/man/postconf.5)). We're going to edit `main.cf` first either by using the command `postconf -e 'setting'` or by editing the file itself (I prefer to edit the file).

Note that the default file itself has a lot of comments with description on what each thing does (or you can look up the manual, linked above), I used what Luke's script did plus some other settings that worked for me.

Now, first locate where your website cert is, mine is at the default location `/etc/letsencrypt/live/`, so my `certdir` is `/etc/letsencrypt/live/luevano.xyz`. Given this information, change `{yourcertdir}` on the corresponding lines. The configuration described below has to be appended in the `main.cf` configuration file.

Certificates and ciphers to use for authentication and security:

```conf
smtpd_tls_key_file={yourcertdir}/privkey.pem
smtpd_tls_cert_file={yourcertdir}/fullchain.pem
smtpd_use_tls = yes
smtpd_tls_auth_only = yes
smtp_tls_security_level = may
smtp_tls_loglevel = 1
smtp_tls_CAfile={yourcertdir}/cert.pem
smtpd_tls_mandatory_protocols = !SSLv2, !SSLv3, !TLSv1, !TLSv1.1
smtp_tls_mandatory_protocols = !SSLv2, !SSLv3, !TLSv1, !TLSv1.1
smtpd_tls_protocols = !SSLv2, !SSLv3, !TLSv1, !TLSv1.1
smtp_tls_protocols = !SSLv2, !SSLv3, !TLSv1, !TLSv1.1
tls_preempt_cipherlist = yes
smtpd_tls_exclude_ciphers = aNULL, LOW, EXP, MEDIUM, ADH, AECDH, MD5,
				DSS, ECDSA, CAMELLIA128, 3DES, CAMELLIA256,
				RSA+AES, eNULL
smtpd_relay_restrictions = permit_sasl_authenticated, permit_mynetworks, defer_unauth_destination
```

Also, for the *connection* with `dovecot`, append the next few lines (telling postfix that `dovecot` will use user/password for authentication):

```conf
smtpd_sasl_auth_enable = yes
smtpd_sasl_type = dovecot
smtpd_sasl_path = private/auth
smtpd_sasl_security_options = noanonymous, noplaintext
smtpd_sasl_tls_security_options = noanonymous
```

Specify the mailbox home (this is going to be a directory inside your user's home):

```conf
home_mailbox = Mail/Inbox/
```

Pre-configuration to work seamlessly with `dovecot` and `opendkim`:

```conf
myhostname = {yourdomainname}
mydomain = localdomain
mydestination = $myhostname, localhost.$mydomain, localhost

milter_default_action = accept
milter_protocol = 6
smtpd_milters = inet:127.0.0.1:8891
non_smtpd_milters = inet:127.0.0.1:8891
mailbox_command = /usr/lib/dovecot/deliver
```

Where `{yourdomainname}` is `luevano.xyz` in my case, or if you have `localhost` configured to your domain, then use `localhost` for `myhostname` (`myhostname = localhost`).

Lastly, if you don't want the sender's IP and user agent (application used to send the mail), add the following line:

```conf
smtp_header_checks = regexp:/etc/postfix/smtp_header_checks
```

And create the `/etc/postfix/smtp_header_checks` file with the following content:

```conf
/^Received: .*/		IGNORE
/^User-Agent: .*/	IGNORE
```

That's it for `main.cf`, now we have to configure `master.cf`. This one is a bit more tricky.

First look up lines (they're uncommented) `smtp inet n - n - - smtpd`, `smtp unix - - n - - smtp` and `-o syslog_name=postfix/$service_name` and either delete or uncomment them... or just run `sed -i "/^\s*-o/d;/^\s*submission/d;/\s*smtp/d" /etc/postfix/master.cf` as stated in Luke's script.

Lastly, append the following lines to complete postfix setup and pre-configure for `spamassassin`.

```conf
smtp unix - - n - - smtp
smtp inet n - y - - smtpd
	-o content_filter=spamassassin
submission inet n - y - - smtpd
	-o syslog_name=postfix/submission
	-o smtpd_tls_security_level=encrypt
	-o smtpd_sasl_auth_enable=yes
	-o smtpd_tls_auth_only=yes
smtps inet n - y - - smtpd
	-o syslog_name=postfix/smtps
	-o smtpd_tls_wrappermode=yes
	-o smtpd_sasl_auth_enable=yes
spamassassin unix - n n - - pipe
	user=spamd argv=/usr/bin/vendor_perl/spamc -f -e /usr/sbin/sendmail -oi -f \${sender} \${recipient}
```

Now, I ran into some problems with postfix, one being [smtps: Servname not supported for ai_socktype](https://www.faqforge.com/linux/fix-for-opensuse-error-postfixmaster-fatal-0-0-0-0smtps-servname-not-supported-for-ai_socktype/), to fix it, as *Till* posted in that site, edit `/etc/services` and add:

```conf
smtps 465/tcp
smtps 465/udp
```

At this point you're done configuring `postfix` and you can already start/enable the service:

```sh
systemctl start postfix
systemctl enable postfix
```

## Dovecot
