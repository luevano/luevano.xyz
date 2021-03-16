# Linux tutorial video notes

I was requested to make a summary of a video about basic Linux stuff (like the [SQL tutorial video notes](https://blog.luevano.xyz/a/sql_video_notes)); this time, I did most of the notes depending on the topic since I'm familiar with most of the stuff presented in the video. The video in question is: [The Complete Linux Course: Beginner to Power User!](https://www.youtube.com/watch?v=wBp0Rb-ZJak). Also, some notes were taken from [Arch Linux Wiki](https://wiki.archlinux.org/) since it's got pretty decent documentation, and, of course, general googling.

## (Basic) commands

A list of basic commands and small explanation (note that options are started with either `-` or `--`, depending on the program, but most of the time `-` is used for letter options and `--` for word options, `-l` vs `--list` for example):

* `pwd`: "print working directory", full **absolute** path to the current directory.
* `cd`: "change directory", followed by the absolute or relative path of the directory to change to.
	* Absolute path is started with `/`, while a relative path is started with `./` or just the name of the folder.
	* Use `..` (two dots) to go up one directory.
	* An abbreviation of `/home/username` is `~` (tilde).
* `ls`: "list" files and directories in current directory, or specify a directory from which to show the list after typing `ls`. Has many options, the most common ones being:
	* `l`: use long listing format.
	* `r` or `reverse`: reverse order while sorting.
	* `s`: sort by file size, largest first.
	* `a` or `all`: do not ignore entries starting with `.`.
* `mkdir`: "make directory", create a new directory with specified name.
* `touch`: create new (empty) files.
* `cp`: "copy" files or directories (using option `r` for recursive). Requires file/directory to copy and destination, separated by space.
* `mv`: "move" files or directories, also requires file/directory to copy and destination, separated by space. This is also used to **rename** files/directories.
* `rm`: "remove", followed by a file to remove it.
* `rmdir`: "remove empty directory", followed by a directory to remove it. If the directory is not empty, use `rm -r` on the directory ("remove recursive").
* `su`: "switch user", by default to **root** user, but another one can be specified.
* `sudo`: "switch user, do", similar to `su`, but only to execute a command as **root** or the specified user.
* `clear`: clear the terminal window, a (common) keyboard shortcut is `Ctrl + l`.
* `find`: search for files/directories matching a pattern or all contents of a directory (using `.`).
* `grep`: comes from the `ed` command "g/re/p", for searching plain-text for lines that match a regular expression (regex).
* `top`: a task manager program, shows currently running commands and gives important info such as PID (process ID), user who is running that command, command name, cpu and ram usage, etc.. Some useful commands to manage programs running are:
	* `pgrep`: get the PID of a running process, or a list in chronological order.
	* `kill` or `pkill`: kill a running process either by PID or by name.
	* `killall`: similar to `pkill`.
* `ssh`: "secure shell" is a remote login client used to connect into a remote machine and executing commands remotely, basically taking control of the remote machine. Widely used when managing servers.
* `ftp` or `sftp`: "(secure) file transfer protocol" used to transfer files from one machine to another one (usually a server). It's recommended to use `sftp` instead of `ftp` because anyone can look through the packages if it's not secured (encrypted).

And in general, to see the options supported by almost any command, use `command -h` or `command --help`, for a quick explanation. **IMPORTANT**: Most programs have **man (manual) pages**; to access them do `man command`, this is a very powerful tool to use.

Commands can be redirected to other commands (the output), which is powerful to create mini scripts or to achieve a goal in a single command. Most of the time the redirection can be done with the special characters `>`, `<` and most powerful, the `|` (pipe). Also, some commands accept an option to execute another command, but this depends on a command to command basis (`exec` option for `find`, for example).

**Most terminal programs accept `Ctrl-c` or just `q` to exit the program.**

## File permissions and ownership

When listing files with `ls -l`, an output with file attributes (permissions) and ownership is shown, such as `drwxr-xr-x 2 user group 4096 Jul 5 21:03 Desktop`, where the first part are the attributes, and `user` and `group` the ownership info (all other info is irrelevant for now).

File attributes (`drwxr-xr-x` in the example above) are specified by 10 (sometimes 11) characters, and can be break into 4 parts (or 5):

* The first character is just the file type, typically `d` for directories or just `-` for files. There is `l` too, which is for **symlinks**.
* The next 3 characters represent the permissions that the **owner** has over the file.
* Next 3 the permissions that the **group** has over the file.
* Next 3 the permissions everyone else (**others**) have over the file.
* An optional `+` character that specifies whether an alternate access method applies to the file. When the character is a space, there is no alterante access method.

Each of the three permission triads (`rwx`) can be:

* `-` or `r`, for the first character, if the file can be **read** or directory's content can be shown.
* `-` or `w`, for the second character, if the file can be **modified** or the directory's content can be modified (create new files or folders or rename existing files or folders).
* `-` or `x`, for the third character, if the file can be **executed** or the directory can be **accessed** with `cd`. Other characters can be present, like `s`, `S`, `t` and `T` (for more: [Arch Linux Wiki: File permissions and attributes](https://wiki.archlinux.org/index.php/File_permissions_and_attributes)).

To change attributes or ownership use `chmod` and `chown`, respectively.

## Services

Special type of linux process (think of a program or set of programs that run in the background waiting to be used, or doing essential tasks). There are many ways to manage (start, stop, restart, enable, disable, etc.) services, the most common way (if using `systemd`) is to just use `systemctl`. Basic usage of `systemctl` is `systemctl verb service`, where `verb` could be `start`, `enable`, `stop`, `disable`, `restart`, etc. Also, to get a general system status run `systemctl status` or just `systemctl` for a list of running **units** (a unit is an instance of a service, or a mount point or even a device or a socket). For more: [Arch Linux Wiki: systemd](https://wiki.archlinux.org/index.php/systemd).

`systemd` also provides a way to do tasks based on a **timer**, where you can schedule from the second to the year. One could also use `cron` (using `crontab` with option `e`) to do this. These timers provide support for calendar time events, monotonic time events, and can be run asynchronously.

## User and group management

Most mainstream linux distributions come with a Graphic User Interface (GUI) to manage users and groups on the system. For a Command-Line Interface (CLI) just use `useradd` (with `passwd` to create a password for a given user) and `groupadd`. Also, other useful commands are `usermod`, `userdel`, `groups`, `gpasswd`, `groupdel` and more, each used for a basic management of users/groups like modification, deletion, listing (of all existing users/groups), etc.. For more: [Arch Linux Wiki: Users and groups](https://wiki.archlinux.org/index.php/users_and_groups).

## Networking

### Hosts file

Located at `/etc/hosts`, serves as a translator from **hostname** (web addresses or URLs) into IP addresses (think of DNS records), meaning that any URL can be overridden to make it point to whatever IP address it's specified (only locally on the machine affected). The syntax of the file is pretty simple: first column for IP, second for hostname (URL) and third+ for aliases.

### (Some) commands

These commands serve the sole purpose of showing information about the network and stuff related to it:

* `ping`: gives information about latency to a given ip/domain.
* `ifconfig`: gives similar information to `ipconfig` on windows, general info of physical network devices with their addresses and properties. An alternative could be `ip addr`, depending on the linux distribution being used and programs installed.
* `tcpdump`: "transmission control protocol dump" gives information on all "packets" being sent and received through the network.
* `netstat`: "network statistics" general statistics about network devices usage, display connections to the machine and more.
* `traceroute`: shows the route that the packets go through (how the packets jump from one server to another one) when trying to access an IP (or, for example, a website).
* `nmap`: "network mapper" explore network available hosts, opened ports, reverse DNS names, can guess the operating system of the device, it's type, MAC address and more.
