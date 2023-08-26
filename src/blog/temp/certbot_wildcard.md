# Change DNS server to Vultr for Certbot automation and * certificate

https://www.vultr.com/docs/introduction-to-vultr-dns/
https://certbot.eff.org/instructions?ws=nginx&os=arch&tab=wildcard
https://github.com/bsorahan/certbot-dns-vultr
https://github.com/alexzorin/certbot-dns-multi

https://wiki.archlinux.org/title/certbot#Managing_Nginx_server_blocks

https://serverfault.com/questions/896711/how-to-totally-remove-a-certbot-created-ssl-certificate


certbote delete
pacman -Rns certbot-nginx # probably still needed, should install just in case
yay -S certbot-dns-vultr

enable api https://www.vultr.com/api/
https://my.vultr.com/settings/#settingsapi

it autodetects tehe subnet for the access control (in my case an ipv6)

create file with contents:

```ini
dns_vultr_token = aabbccddeeff112233445566778899
```
and permissions: `600`
update create certificate script (by adding): 

```sh
CREDENTIALS_FILE=/path/to/credential/file
DOMAINS=example.com,mail.example.com,*.example.com
EMAIL=hey@example.xom

certbot certonly --domains $DOMAINS --email $EMAIL \
--authenticator dns-vultr
--dns-vultr-credentials $CREDENTIALS_FILE
--preferred-challenges dns-01
```

the certificate will be installed at:

```
/etc/letsencrypt/live/example.com/fullchain.pem
/etc/letsencrypt/live/example.com/privkey.pem
```


the renewal configuration is stored at: `/etc/letsencrypt/renewal/example.com.conf` useful when needing to change the api key

test renew:

```sh
certbot renew --dry-run
```

update the `certbot-renew.service` by adding the `nginx.service` restart hoook: ``
by doing `systemctl edit certbot-renew.service` and adding:

```ini
[Service]
ExecStart=/usr/bin/certbot -q renew --post-hook "systemctl reload nginx.service"
```

create redirect all to https config: https://phoenixnap.com/kb/redirect-http-to-https-nginx

```nginx
server {
    listen 80 default_server;
    server_name _;
    return 301 https://$host$request_uri;
}
```

add the redirect config to `nginx.conf`


create the config file for 443 ssl (to include in each config file):

```nginx
listen 443 ssl;
listen [::]:443 ssl;
http2 on;
ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem; # managed by Certbot
ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem; # managed by Certbot
include /etc/letsencrypt/options-ssl-nginx.conf; # managed by Certbot
ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem; # managed by Certbot
```

add this config to all config files that require it
