title: My setup for a password manager and MFA authenticator
author: David Luévano
lang: en
summary: A short description on my personal setup regarding a password manager and alternatives to G\*\*gl\* authenticator.
tags: tools
	short
	english

**Disclaimer**: I won't go into many technical details here of how to install/configure/use the software, this is just supposed to be a short description on my setup.

It's been a while since I started using a password manager at all, and I'm happy that I started with [KeePassXC](https://keepassxc.org/) (open source, multiplatform password manager that it's completely offline) as a direct recommendation from [lm](https://www.lmcj.xyz/); before this I was using the same password for everything (like a lot of people), which is a well know privacy issue as noted in detail by [Leo](https://askleo.com/different-passwords-for-everything/) (I don't personally recommed LastPass as Leo does). Note that you will still need a *master password* to lock/unlock your password database (you can additionally use a hardware key and a key file).

Anyways, setting up *keepass* is pretty simple, as there is a client for almost any device; note that *keepass* is basically just the format and the base for all of the clients, as its common with pretty much any open source software. In my case I'm using [KeePassXC](https://keepassxc.org/) in my computer and [KeePassDX](https://www.keepassdx.com/) in my phone (Android). The only concern is keeping everything in sync because *keepass* doesn't have any automatic method of synchronizing between devices because of security reasons (as far as I know), meaning that you have to manage that yourself.

Usually you can use something like G\*\*gl\* drive, dropbox, mega, nextcloud, or any other cloud solution that you like to sync your *keepass* database between devices; I personally prefer to use [Syncthing](https://syncthing.net/) as it's open source, it's really easy to setup and has worked wonders for me since I started using it, also it keeps versions of your files that can serve as backups in any scenario where the database gets corrupted or something.

Finally, when I went through the issue with the micro SD and the *adoptable storage* bullshit (you can find the rant [here](https://blog.luevano.xyz/a/devs_android_me_trozaron.html), in spanish) I had to also migrate from *G\*\*gl\* authenticator* (*gauth*) to something else for the simple reason that *gauth* doesn't even let you do backups, nor it's synched with your account... nothing, it is just standalone and if you ever lose your phone you're fucked; so I decided to go with [Aegis authenticator](https://getaegis.app/), as it is open source, you have control over all your secret keys, you can do backups directly to the filesystem, you can secure your database with an extra password, etc., etc.. In general *aegis* is the superior MFA authenticator (at least compared with *gauth*) and everything that's compatible with *gauth* is compatible with *aegis* as the format is a standard (as a matter of fact, *keepass* also has this MFA feature which is called TOPT and is also compatible, but I prefer to have things separate). I also use *syncthing* to keep a backup of my *aegis* database.

**TL;DR**:

- [Syncthing](https://syncthing.net/) to sync files between devices (for the password databases).
- [KeePassXC](https://keepassxc.org/) for the password manager in my computer.
- [KeePassDX](https://www.keepassdx.com/) for the password manager in my phone.
- [Aegis authenticator](https://getaegis.app/) for the universal MFA authenticator.