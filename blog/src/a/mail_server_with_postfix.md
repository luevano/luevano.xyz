# Create a Mail server with Postfix, Dovecot, SpamAssassin and OpenDKIM

The entry is going to be long because it's a *tedious* process. This is also based on [Luke Smith's script](https://github.com/LukeSmithxyz/emailwiz), but adapted to Arch Linux (his script works on debian-based distributions). This entry is mostly so I can record all the notes required while I'm in the process of installing/configuring the mail server on a new VPS of mine; also I'm going to be writing a script that does everything in one go (for Arch Linux), that will be hosted [here](https://git.luevano.xyz/server_scripts.git).

This configuration works for local users (users that appear in `/etc/passwd`), and does not use any type of SQL. And note that most if not all commands executed here are run with root privileges.

More in depth configuration is detailed in the Arch Wiki for each package used here.

## Prerequisites

Basically the same as with the [website with Nginx and Certbot](https://blog.luevano.xyz/a/website_with_nginx.html):

* A domain name. Got mine on [Epik](https://www.epik.com/?affid=da5ne9ru4) (affiliate link, btw).
	* Later we'll be adding some **MX**  and **TXT** records.
	* You also need a **CNAME** for "mail" and (optionally) "www.mail", or whatever you want to call the sub-domains (although the [RFC 2181](https://tools.ietf.org/html/rfc2181#section-10.3) states that it NEEDS to be an **A** record, fuck the police), to actually work and to get SSL certificate (you can also use the SSL certificate obtained if you created a website following my other notes on `nginx` and `certbot`).
* A VPS or somewhere else to host. I'm using [Vultr](https://www.vultr.com/?ref=8732849) (also an affiliate link).
	* Also `ssh` configured.
	* Ports 25, 587 (SMTP), 465 (SMTPS), 143 (IMAP) and 993 (IMAPS) open on the firewall (I use `ufw`).
	* With `nginx` and `certbot` setup and running.

## Postfix

[Postfix](https://wiki.archlinux.org/index.php/Postfix) is a "mail transfer agent" which is the component of the mail server that receives and sends emails via SMTP.

Install the `postfix` package:

```sh
pacman -S postfix
```

We have two main files to configure (inside `/etc/postfix`): `master.cf` ([master(5)](https://man.archlinux.org/man/master.5)) and `main.cf` ([postconf(5)](https://man.archlinux.org/man/postconf.5)). We're going to edit `main.cf` first either by using the command `postconf -e 'setting'` or by editing the file itself (I prefer to edit the file).

Note that the default file itself has a lot of comments with description on what each thing does (or you can look up the manual, linked above), I used what Luke's script did plus some other settings that worked for me.

Now, first locate where your website cert is, mine is at the default location `/etc/letsencrypt/live/`, so my `certdir` is `/etc/letsencrypt/live/luevano.xyz`. Given this information, change `{yourcertdir}` on the corresponding lines. The configuration described below has to be appended in the `main.cf` configuration file.

Certificates and ciphers to use for authentication and security:

```conf
smtpd_tls_key_file = {yourcertdir}/privkey.pem
smtpd_tls_cert_file = {yourcertdir}/fullchain.pem
smtpd_use_tls = yes
smtpd_tls_auth_only = yes
smtp_tls_security_level = may
smtp_tls_loglevel = 1
smtp_tls_CAfile = {yourcertdir}/cert.pem
smtpd_tls_mandatory_protocols = !SSLv2, !SSLv3, !TLSv1, !TLSv1.1
smtp_tls_mandatory_protocols = !SSLv2, !SSLv3, !TLSv1, !TLSv1.1
smtpd_tls_protocols = !SSLv2, !SSLv3, !TLSv1, !TLSv1.1
smtp_tls_protocols = !SSLv2, !SSLv3, !TLSv1, !TLSv1.1
tls_preempt_cipherlist = yes
smtpd_tls_exclude_ciphers = aNULL, LOW, EXP, MEDIUM, ADH, AECDH, MD5,
				DSS, ECDSA, CAMELLIA128, 3DES, CAMELLIA256,
				RSA+AES, eNULL

smtp_tls_CApath = /etc/ssl/certs
smtpd_tls_CApath = /etc/ssl/certs

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

Before starting the `postfix` service, you need to run `newaliases` first (but you can do a bit of configuration beforehand). Edit the file `/etc/postfix/aliases` and edit accordingly. I only change the `root: you` line (where `you` is the account that will be receiving "root" mail). Check the Arch Wiki for more info and other alternatives/options. After you're done, run:

```sh
postalias /etc/postfix/aliases
newaliases
```

At this point you're done configuring `postfix` and you can already start/enable the `postfix` service:

```sh
systemctl start postfix.service
systemctl enable postfix.service
```

## Dovecot

[Dovecot](https://wiki.archlinux.org/index.php/Dovecot) is an IMAP and POP3 server, which is what lets an email application retrieve the mail.

Install the `dovecot` and `pigeonhole` (sieve for `dovecot`) packages:

```sh
pacman -S dovecot pigeonhole
```

On arch, by default, there is no `/etc/dovecot` directory with default configurations set in place, but the package does provide the example configuration files. Create the `dovecot` directory under `/etc` and, optionally, copy the `dovecot.conf` file and `conf.d` directory under the just created `dovecot` directory:

```sh
mkdir /etc/dovecot
cp /usr/share/doc/dovecot/example-config/dovecot.conf /etc/dovecot/dovecot.conf
cp -r /usr/share/doc/dovecot/example-config/conf.d /etc/dovecot
```

As Luke stated, `dovecot` comes with a lot of "modules" (under `/etc/dovecot/conf.d/` if you copied that folder) for all sorts of configurations that you can include, but I do as he does and just edits/creates the whole `dovecot.conf` file; although, I would like to check each of the separate configuration files `dovecot` provides I think the options Luke provides are more than good enough.

I'm working with an empty `dovecot.conf` file. Add the following lines for SSL and login configuration (also replace `{yourcertdir}` with the same certificate directory described in the Postfix section above, note that the `<` is required):

```conf
ssl = required
ssl_cert = <{yourcertdir}/fullchain.pem
ssl_key = <{yourcertdir}/privkey.pem
ssl_min_protocol = TLSv1.2
ssl_cipher_list = ALL:!RSA:!CAMELLIA:!aNULL:!eNULL:!LOW:!3DES:!MD5:!EXP:!PSK:!SRP:!DSS:!RC4:!SHA1:!SHA256:!SHA384:!LOW@STRENGTH
ssl_prefer_server_ciphers = yes
ssl_dh = </etc/dovecot/dh.pem

auth_mechanisms = plain login
auth_username_format = %n
protocols = $protocols imap
```

You may notice we specify a file we don't have under `/etc/dovecot`: `dh.pem`. We need to create it with `openssl` (you should already have it installed if you've been following this entry and the one for `nginx`). Just run (might take a few minutes):

```sh
openssl dhparam -out /etc/dovecot/dh.pem 4096
```

After that, the next lines define what a "valid user is" (really just sets the database for users and passwords to be the local users with their password):

```conf
userdb {
	driver = passwd
}

passdb {
	driver = pam
}
```

Next, comes the mail directory structure (has to match the one described in the Postfix section). Here, the `LAYOUT` option is important so the boxes are `.Sent` instead of `Sent`. Add the next lines (plus any you like):

```conf
mail_location = maildir:~/Mail:INBOX=~/Mail/Inbox:LAYOUT=fs
namespace inbox {
	inbox = yes

	mailbox Drafts {
		special_use = \Drafts
		auto = subscribe
		}

	mailbox Junk {
		special_use = \Junk
		auto = subscribe
		autoexpunge = 30d
		}

	mailbox Sent {
		special_use = \Sent
		auto = subscribe
		}

	mailbox Trash {
		special_use = \Trash
		}

	mailbox Archive {
		special_use = \Archive
		}
}
```

Also include this so Postfix can use Dovecot's authentication system:

```conf
service auth {
	unix_listener /var/spool/postfix/private/auth {
		mode = 0660
		user = postfix
		group = postfix
		}
}
```

Lastly (for `dovecot` at least), the plugin configuration for `sieve` (`pigeonhole`):

```conf
protocol lda {
	mail_plugins = $mail_plugins sieve
}

protocol lmtp {
	mail_plugins = $mail_plugins sieve
}

plugin {
	sieve = ~/.dovecot.sieve
	sieve_default = /var/lib/dovecot/sieve/default.sieve
	sieve_dir = ~/.sieve
	sieve_global_dir = /var/lib/dovecot/sieve/
```

Where `/var/lib/dovecot/sieve/default.sieve` doesn't exist yet. Create the folders:

```sh
mkdir -p /var/lib/dovecot/sieve
```

And create the file `default.sieve` inside that just created folder with the content:

```conf
require ["fileinto", "mailbox"];
if header :contains "X-Spam-Flag" "YES" {
	fileinto "Junk";
}
```

Now, if you don't have a `vmail` (virtual mail) user, create one and change the ownership of the `/var/lib/dovecot` directory to this user:

```sh
grep -q "^vmail:" /etc/passwd || useradd -m vmail -s /usr/bin/nologin
chown -R vmail:vmail /var/lib/dovecot
```

Note that I also changed the shell for `vmail` to be `/usr/bin/nologin`. After that, run:

```sh
sievec /var/lib/dovecot/sieve/default.sieve
```

To compile the configuration file (a `default.svbin` file will be created next to `default.sieve`).

Next, add the following lines to `/etc/pam.d/dovecot` if not already present (shouldn't be there if you've been following these notes):

```conf
auth required pam_unix.so nullok
account required pam_unix.so
```

That's it for `dovecot`, at this point you can start/enable the `dovecot` service:

```sh
systemctl start dovecot.service
systemctl enable dovecot.service
```

# OpenDKIM

[OpenDKIM](https://wiki.archlinux.org/index.php/OpenDKIM) is needed so services like G\*\*gle (we don't mention that name here \[\[\[this is a meme\]\]\]) don't throw the mail to the trash. DKIM stands for "DomainKeys Identified Mail".

Install the `opendkim` package:

```sh
pacman -S opendkim
```

Generate the keys for your domain:

```sh
opendkim-genkey -D /etc/opendkim -d {yourdomain} -s {yoursubdomain} -r -b 2048
```

Where you need to change `{yourdomain}` and `{yoursubdomain}` (doesn't really need to be the sub-domain, could be anything that describes your key) accordingly, for me it's `luevano.xyz` and `mail`, respectively. After that, we need to create some files inside the `/etc/opendkim` directory. First, create the file `KeyTable` with the content:

```conf
{yoursubdomain}._domainkey.{yourdomain} {yourdomain}:{yoursubdomain}:/etc/opendkim/{yoursubdomain}.private
```

So, for me it would be:

```conf
mail._domainkey.luevano.xyz luevano.xyz:mail:/etc/opendkim/mail.private
```

Next, create the file `SigningTable` with the content:

```conf
*@{yourdomain} {yoursubdomain}._domainkey.{yourdomain}
```

Again, for me it would be:

```conf
*@luevano.xyz mail._domainkey.luevano.xyz
```

And, lastly create the file `TrustedHosts` with the content:

```conf
127.0.0.1
::1
10.1.0.0/16
1.2.3.4/24
localhost
{yourserverip}
...
```

And more, make sure to include your server IP and something like `subdomain.domainname`.

Next, edit `/etc/opendkim/opendkim.conf` to reflect the changes (or rather, additions) of these files, as well as some other configuration. You can look up the example configuration file located at `/usr/share/doc/opendkim/opendkim.conf.sample`, but I'm creating a blank one with the contents:

```conf
Domain {yourdomain}
Selector {yoursubdomain}

Syslog Yes
UserID opendkim

KeyFile /etc/opendkim/{yoursubdomain}.private
Socket inet:8891@localhost
```

Now, change the permissions for all the files inside `/etc/opendkim`:

```conf
chown -R root:opendkim /etc/opendkim
chmod g+r /etc/postfix/dkim/*
```

I'm using `root:opendkim` so `opendkim` doesn't complain about the `{yoursubdomani}.private` being insecure (you can change that by using the option `RequireSafeKeys False` in the `opendkim.conf` file, as stated [here](http://lists.opendkim.org/archive/opendkim/users/2014/12/3331.html)).

That's it for the general configuration, but you could go more in depth and be more secure with some extra configuration as described in the [Arch Wiki entry for OpenDKIM](https://wiki.archlinux.org/index.php/OpenDKIM#Security).

Now, just start/enable the `opendkim` service:

```sh
systemctl start opendkim.service
systemctl enable opendkim.service
```

And don't forget to add the following **TXT** records on your domain registrar (these examples are for Epik):

1. *DKIM* entry: look up your `{yoursubdomain}.txt` file, it should look something like:

```txt
{yoursubdomain}._domainkey IN TXT ( "v=DKIM1; k=rsa; s=email; "
	"p=..."
	"..." )  ; ----- DKIM key mail for {yourdomain}
```

In the TXT record you will place `{yoursubdomain}._domainkey` as the "Host" and `"v=DKIM1; k=rsa; s=email; " "p=..." "..."` in the "TXT Value" (replace the dots with the actual value you see in your file).

2. *DMARC* entry: just `_dmarc.{yourdomain}` as the "Host" and `"v=DMARC1; p=reject; rua=mailto:dmarc@{yourdomain}; fo=1"` as the "TXT Value".

3. *SPF* entry: just `@` as the "Host" and `"v=spf1 mx a:{yoursubdomain}.{yourdomain} - all"` as the "TXT Value".

And at this point you could test your mail for spoofing and more, but you don't know -yet- how to login (it's really easy, but I'm gonna state that at the end of this entry).

## SpamAssassin

[SpamAssassin](https://wiki.archlinux.org/index.php/SpamAssassin) is just *a mail filter to identify spam*.

Install the `spamassassin` package (which will install a bunch of ugly `perl` packages...):

```sh
pacman -S spamassassin
```

For some reason, the permissions on all `spamassassin` stuff are all over the place. First, change owner of the executables, and directories:

```sh
chown spamd:spamd /usr/bin/vendor_perl/sa-*
chown spamd:spamd /usr/bin/vendor_perl/spam*
chwown -R spamd:spamd /etc/mail/spamassassin
```

Then, you can edit `local.cf` (located in `/etc/mail/spamassassin`) to fit your needs (I only uncommented the `rewrite_header Subject ...` line). And then you can run the following command to update the patterns and compile them:

```sh
sudo -u spamd sa-update
sudo -u spamd sa-compile
```

And since this should be run periodically, create the service `spamassassin-update.service` under `/etc/systemd/system` with the following content:

```conf
[Unit]
Description=SpamAssassin housekeeping
After=network.target

[Service]
User=spamd
Group=spamd
Type=oneshot

ExecStart=/usr/bin/vendor_perl/sa-update --allowplugins
SuccessExitStatus=1
ExecStart=/usr/bin/vendor_perl/sa-compile
ExecStart=/usr/bin/systemctl -q --no-block try-restart spamassassin.service
```

And you could also execute `sa-learn` to train `spamassassin`'s bayes filter, but this works for me. Then create the timer `spamassassin-update.timer` under the same directory, with the content:

```conf
[Unit]
Description=SpamAssassin housekeeping

[Timer]
OnCalendar=daily
Persistent=true

[Install]
WantedBy=timers.target
```

You can now start/enable the `spamassassin-update` timer:

```sh
systemctl start spamassassin-update.timer
systemctl enable spamassassin-update.timer
```

Next, you may want to edit the `spamassassin` service before starting and enabling it, because by default, it could [spawn a lot of "childs"](https://rimuhosting.com/howto/memory.jsp) eating a lot of resources and you really only need one child. Append `--max-children=1` to the line `ExecStart=...` in `/usr/bin/systemd/system/spamassassin.service`:

```conf
...
ExecStart=/usr/bin/vendor_perl/spamd -x -u spamd -g spamd --listen=/run/spamd/spamd.sock --listen=localhost --max-children=1
...
```

Finally, start and enable the `spamassassin` service:

```sh
systemctl start spamassassin.service
systemctl enable spamassassin.service
```

## Wrapping up

We should have a working mail server by now. Before continuing check your journal logs (`journalctl -xe --unit={unit}`, where `{unit}` could be `spamassassin.service`for example) to see if there was any error whatsoever and try to debug it, it should be a typo somewhere (the logs are generally really descriptive) because all the settings and steps detailed here just (literally just finished doing everything on a new server as of the writing of this text) worked *(((it just werks on my machine)))*.

Now, to actually use the mail service: first of all, you need a *normal* account (don't use root) that belongs to the `mail` group (`gpasswd -a user group` to add a user `user` to group `group`) and that has a password.

Next, to actually login into a mail app/program/whateveryouwanttocallit, you will use the following settings, at least for `thunderdbird`(I tested in windows default mail app and you don't need a lot of settings):

* \* server: subdomain.domain (mail.luevano.xyz in my case)
* **SMTP** port: 587
* **SMTPS** port: 465 (I use this one)
* **IMAP** port: 143
* **IMAPS** port: 993 (again, I use this one)
* Connection/security: SSL/TLS
* Authentication method: Normal password
* Username: just your `user`, not the whole email (`david` in my case)
* Password: your `user` password (as in the password you use to login to the server with that user)

All that's left to do is test your mail server for spoofing, and to see if everything is setup correctly. Go to [DKIM Test](https://www.appmaildev.com/en/dkim) and follow the instructions (basically click next, and send an email with whatever content to the email that they provide). After you send the email, you should see something like:

![DKIM Test successful](https://static.luevano.xyz/images/b/notes/mail/dkim_test_successful.png)

(Yes, I blurred a lot in the picture just to be sure, either way what's important is the list on the bottom part of the image)

Finally, that's actually it for this entry, if you have any problem whatsoever you have my info down below.
