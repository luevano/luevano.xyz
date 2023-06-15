title: Configure system logs on Arch to avoid filled up disk
author: David Luévano
lang: en
summary: How to configure the system logs, mostly journald, from filling up the disk, on Arch.
tags: short
    server
	tools
	code
	tutorial
	english

It's been a while since I've been running a minimal server on a VPS, and it is a pretty humble VPS with just 32 GB of storage which works for me as I'm only hosting a handful of services. At some point I started noticing that the disk keept filling up on each time I checked.

Turns out that out of the box, Arch has a default config for `systemd`'s `journald` that keeps a persistent `journal` log, but doesn't have a limit on how much logging is kept. This means that depending on how many services, and how aggresive they log, it can be filled up pretty quickly. For me I had around 15 GB of logs, from the normal `journal` directory, `nginx` directory and my now unused `prosody` instance.

For `prosody` it was just a matter of deleting the directory as I'm not using it anymore, which freed around 4 GB of disk space.
For `journal` I did a combination of configuring `SystemMaxUse` and creating a *Namespace* for all "email" related services as mentioned in the [Arch wiki: systemd/Journal](https://wiki.archlinux.org/title/Systemd/Journal#Per_unit_size_limit_by_a_journal_namespace); basically just configuring `/etc/systemd/journald.conf` (and `/etc/systemd/journald@email.con` with the comment change) with:

```conf
[Journal]
Storage=persistent
SystemMaxUse=100MB # 50MB for the "email" Namespace
```

And then for each service that I want to use this "email" *Namespace* I add:

```conf
[Service]
LogNamespace=email
```

Which can be changed manually or by executing `systemctl edit service_name.service` and it will create an override file which will be read on top of the normal service configuration. Once configured restart by running `systemctl daemon-reload` and `systemctl restart service_name.service` (probably also restart `systemd-journald`).

I also disabled the logging for `ufw` by running `ufw logging off` as it logs everything to the `kernel` "unit", and I didn't find a way to pipe its logs to a separate directory. It really isn't that useful as most of the logs are the normal `[UFW BLOCK]` log, which is normal. If I need debugging then I'll just enable that again. Note that you can change the logging level, if you still want some kind of logging.

Finally to clean up the `nginx` logs, you need to install `logrotate` (`pacman -S logrotate`) as that is what is used to clean up the `nginx` log directory. `nginx` already "installs" a config file for `logrotate` which is located at `/etc/logrotate.d/`, I just added a few lines:

```
/var/log/nginx/*log {
    rotate 7
    weekly
    dateext
    dateformat -%Y-%m-%d
    missingok
    notifempty
    create 640 http log
    sharedscripts
    compress
    postrotate
        test ! -r /run/nginx.pid || kill -USR1 `cat /run/nginx.pid`
    endscript
}
```

Once you're ok with your config, it's just a matter of running `logrotate -v -f /etc/logrotate.d/nginx` which forces the run of the rule for `nginx`. After this, `logrotate` will be run daily if you `enable` the `logrotate` timer: `systemctl enable logrotate.timer`.