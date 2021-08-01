title: Create a VPN server with OpenVPN (IPv4)
author: David Luévano
lang: en
summary: How to create a VPN server using OpenVPN on a server running Nginx. Only for IPv4.
tags: server
	tools
	tutorial
	english

I've been wanting to do this entry, but had no time to do it since I also have to set up the VPN service as well to make sure what I'm writing makes sense, today is the day.

Like with any other of my entries I based my setup on the [Arch Wiki](https://wiki.archlinux.org/title/OpenVPN), [this install script](https://github.com/Nyr/openvpn-install) and [this profile generator script](https://github.com/graysky2/ovpngen).

This will be installed and working alongside the other stuff I've wrote about on other posts (see the [server](https://blog.luevano.xyz/tag/@server.html) tag). All commands here are executes as root unless specified otherwise. Also, this is intended only for IPv4 (it's not that hard to include IPv6, but meh).

## Prerequisites

Pretty simple:

- Working server with root access, and with Ufw as the firewall.
- Depending on what port you want to run the VPN on, the default `1194`, or as a fallback on `443` (click [here](https://openvpn.net/vpn-server-resources/advanced-option-settings-on-the-command-line/) for more). I will do mine on port `1194` but it's just a matter of changing 2 lines of configuration and one Ufw rule.

## Create PKI from scratch

PKI stands for *Public Key Infrastructure* and basically it's required for certificates, private keys and more. This is supposed to work between two servers and one client: a server in charge of creating, signing and verifying the certificates, a server with the OpenVPN service running and the client making the request.

This is supposed to work something like: 1) a client wants to use the VPN service, so it creates a requests and sends it to the signing server, 2) this server checks the requests and signs the request, returning the certificates to both the VPN service and the client and 3) the client can now connect to the VPN service using the signed certificate which the OpenVPN server knows about. In a nutshell, I'm no expert.

... but, to be honest, all of this is a hassle and (in my case) I want something simple to use and manage. So I'm gonna do all on one server and then just give away the configuration file for the clients, effectively generating files that anyone can run and will work, meaning that you need to be careful who you give this files (it also comes with a revoking mechanism, so no worries).

This is done with [Easy-RSA](https://wiki.archlinux.org/title/Easy-RSA).

Install the `easy-rsa` package:

```sh
pacman -S easy-rsa
```

Initialize the PKI and generate the CA keypair:

```sh
cd /etc/easy-rsa
easyrsa init-pki
easyrsa build-ca nopass
```

Create the server certificate and private key (while in the same directory):

```sh
EASYRSA_CERT_EXPIRE=3650 easyrsa build-server-full server nopass
```

Where `server` is just a name to identify your server certificate keypair, I just use `server` but could be anything (like `luevano.xyz` in my case).

Create the client revocation list AKA CRL (will be used later, but might as well have it now):

```sh
EASYRSA_CRL_DAYS=3650 easyrsa gen-crl
```

After this we should have 6 new files:

```
/etc/easy-rsa/pki/ca.crt
/etc/easy-rsa/pki/private/ca.key
/etc/easy-rsa/pki/issued/server.crt
/etc/easy-rsa/pki/reqs/server.req
/etc/easy-rsa/pki/private/server.key
/etc/easy-rsa/pki/crl.pem
```

It is recommended to copy some of these files over to the `openvpn` directory, but I prefer to keep them here and just change some of the permissions:

```sh
chmod o+rx pki
chmod o+rx pki/ca.crt
chmod o+rx pki/issued
chmod o+rx pki/issued/server.crt
chmod o+rx pki/private
chmod o+rx pki/private/server.key
chown nobody:nobody pki/crl.pem
chmod o+r pki/crl.pem
```

Now, go to the `openvpn` directory and create the required files there:

```sh
cd /etc/openvpn/server
openssl dhparam -out dh.pem 2048
openvpn --genkey secret ta.key
```

That's it for the PKI stuff and general certificate configuration.

## OpenVPN

[OpenVPN](https://wiki.archlinux.org/title/OpenVPN) is a robust and highly flexible VPN daemon, that's pretty complete feature wise.

Install the `openvpn` package:

```sh
pacman -S openvpn
```

Now, most of the stuff is going to be handled by (each, if you have more than one) server configuration. This might be the hardest thing to configure, but I've used a basic configuration file that worked a lot to me, which is a compilation of stuff that I found on the internet while configuring the file a while back.

```
# Server ip addres (ipv4).
local 1.2.3.4 # your server public ip

# Port.
port 1194 # Might want to change it to 443

# TCP or UDP.
;proto tcp
proto udp # If ip changes to 443, you should change this to tcp, too

# "dev tun" will create a routed IP tunnel,
# "dev tap" will create an ethernet tunnel.
;dev tap
dev tun

# Server specific certificates and more.
ca /etc/easy-rsa/pki/ca.crt
cert /etc/easy-rsa/pki/issued/server.crt
key /etc/easy-rsa/pki/private/server.key  # This file should be kept secret.
dh /etc/openvpn/server/dh.pem
auth SHA512
tls-crypt /etc/openvpn/server/ta.key 0 # This file is secret.
crl-verify /etc/easy-rsa/pki/crl.pem

# Network topology.
topology subnet

# Configure server mode and supply a VPN subnet
# for OpenVPN to draw client addresses from.
server 10.8.0.0 255.255.255.0

# Maintain a record of client <-> virtual IP address
# associations in this file.
ifconfig-pool-persist ipp.txt

# Push routes to the client to allow it
# to reach other private subnets behind
# the server.
;push "route 192.168.10.0 255.255.255.0"
;push "route 192.168.20.0 255.255.255.0"

# If enabled, this directive will configure
# all clients to redirect their default
# network gateway through the VPN, causing
# all IP traffic such as web browsing and
# and DNS lookups to go through the VPN
push "redirect-gateway def1 bypass-dhcp"

# Certain Windows-specific network settings
# can be pushed to clients, such as DNS
# or WINS server addresses.
# Google DNS.
;push "dhcp-option DNS 8.8.8.8"
;push "dhcp-option DNS 8.8.4.4"

# The keepalive directive causes ping-like
# messages to be sent back and forth over
# the link so that each side knows when
# the other side has gone down.
keepalive 10 120

# The maximum number of concurrently connected
# clients we want to allow.
max-clients 5

# It's a good idea to reduce the OpenVPN
# daemon's privileges after initialization.
user nobody
group nobody

# The persist options will try to avoid
# accessing certain resources on restart
# that may no longer be accessible because
# of the privilege downgrade.
persist-key
persist-tun

# Output a short status file showing
# current connections, truncated
# and rewritten every minute.
status openvpn-status.log

# Set the appropriate level of log
# file verbosity.
#
# 0 is silent, except for fatal errors
# 4 is reasonable for general usage
# 5 and 6 can help to debug connection problems
# 9 is extremely verbose
verb 3

# Notify the client that when the server restarts so it
# can automatically reconnect.
# Only usable with udp.
explicit-exit-notify 1
```

`#` and `;` are comments. Read each and every line, you might want to change some stuff (like the logging).

Now, we need to enable *packet forwarding*, which can be enabled on the interface level or globally (you can check the different options with `sysctl -a | grep forward`). I'll do it globally, run:

```sh
sysctl net.ipv4.ip_forward=1
```

And create/edit the file `/etc/sysctl.d/30-ipforward.conf`:

```
net.ipv4.ip_forward=1
```

Now we need to configure `ufw` to forward traffic through the VPN. Append the following to `/etc/default/ufw` (or edit the existing line):

```
...
DEFAULT_FORWARD_POLICY="ACCEPT"
```

And change the `/etc/ufw/before.rules`, appending the following lines after the header **but before the \*filter line**:

```
...
# NAT (Network Address Translation) table rules
*nat
:POSTROUTING ACCEPT [0:0]

# Allow traffic from clients to the interface
-A POSTROUTING -s 10.8.0.0/24 -o interface -j MASQUERADE

# do not delete the "COMMIT" line or the NAT table rules above will not be processed
COMMIT

# Don't delete these required lines, otherwise there will be errors
*filter
...
```

Where `interface` must be changed depending on your interface (in my case is `ens3`, another common one is `eth0`); I always check this by running `ip addr`, you will get a list of interfaces of which the one containing your public ip is the one that you want, for me it looks something like:

```
...
2: ens3: <SOMETHING,SOMETHING> bla bla
	link/ether bla:bla
	altname enp0s3
	inet my.public.ip.addr bla bla
...
```

And also make sure the `10.8.0.0/24` matches the subnet mask specified in the `server.conf` file (in this example it matches). You should check this very carefully, because I just spend a good 2 hours debugging why my configuration wasn't working, and this was te reason (I could connect to the VPN, but had no external connection to the web).

Finally, allow the OpenVPN port you specified (in this example its `1194/udp`) and reload `ufw`:

```sh
ufw allow 1194/udp comment "OpenVPN"
ufw reload
```

At this point, the server-side configuration is done and you can start and enable the service:

```sh
systemctl start openvpn-server@server.service
systemctl enable openvpn-server@server.service
```

Where the `server` after `@` is your specific configuration, in my case it is called just `server`.

### Create client configurations

You might notice that I didn't specify how to actually connect to our server. For that we need to do a few more steps. We actually need a configuration file similar to the `server.conf` file that we created.

The real way of doing this would be to run similar steps as the ones with `easy-rsa` locally, send them to the server, sign them, and retrieve them. Nah, we'll just create all configuration files on the server as I was mentioning earlier.

Also, the client configuration file has to match the server one (to some degree), to make this easier you can create a `client-common` file in `/etc/openvpn/server` with the following content:

```
client
dev tun
remote 1.2.3.4 1194 udp # change this to match your ip and port
resolv-retry infinite
nobind
persist-key
persist-tun
remote-cert-tls server
auth SHA512
verb 3
```

Where you should make any changes necessary, depending on your configuration.

Now, we need a way to create and revoke new configuration files. For this I created a script, heavily based on one of the links I mentioned at the beginning, by the way. You can place these scripts anywhere you like, and you should take a look before running them because you'll be running them as root.

In a nutshell, what it does is: generate a new client certificate keypair, update the CRL and create a new `.ovpn` configuration file that consists on the `client-common` data and all of the required certificates; or, revoke an existing client and refresh the CRL. The file is placed under `~/ovpn`.

Create a new file with the following content (name it whatever you like) and don't forget to make it executable (`chmod +x script_name`):

```
#!/bin/sh
# Client ovpn configuration creation and revoking.
MODE=$1
if [ ! "$MODE" = "new" -a ! "$MODE" = "rev" ]; then
    echo "$1 is not a valid mode, using default 'new'"
    MODE=new
fi

CLIENT=${2:-guest}
if [ -z $2 ];then
    echo "there was no client name passed as second argument, using 'guest' as default"
fi

# Expiration config.
EASYRSA_CERT_EXPIRE=3650
EASYRSA_CRL_DAYS=3650

# Current PWD.
CPWD=$PWD
cd /etc/easy-rsa/

if [ "$MODE" = "rev" ]; then
    easyrsa --batch revoke $CLIENT

    echo "$CLIENT revoked."
elif [ "$MODE" = "new" ]; then
    easyrsa build-client-full $CLIENT nopass

    # This is what actually generates the config file.
    {
    cat /etc/openvpn/server/client-common
    echo "<ca>"
    cat /etc/easy-rsa/pki/ca.crt
    echo "</ca>"
    echo "<cert>"
    sed -ne '/BEGIN CERTIFICATE/,$ p' /etc/easy-rsa/pki/issued/$CLIENT.crt
    echo "</cert>"
    echo "<key>"
    cat /etc/easy-rsa/pki/private/$CLIENT.key
    echo "</key>"
    echo "<tls-crypt>"
    sed -ne '/BEGIN OpenVPN Static key/,$ p' /etc/openvpn/server/ta.key
    echo "</tls-crypt>"
    } > "$(eval echo ~${SUDO_USER:-$USER}/ovpn/$CLIENT.ovpn)"

    eval echo "~${SUDO_USER:-$USER}/ovpn/$CLIENT.ovpn file generated."
fi

# Finish up, re-generates the crl
easyrsa gen-crl
chown nobody:nobody pki/crl.pem
chmod o+r pki/crl.pem
cd $CPWD
```

And the way to use is to run `ovpn_script new/rev client_name` as sudo (when revoking, it doesn't actually deletes the `.ovpn` file in `~/ovpn`). Again, this is a little script that I put together, so you should check it out, it might need tweaks (depending on your directory structure for `easy-rsa`) and it might have errors.

Now, just get the `.ovpn` file generated, import it to OpenVPN in your client of preference and you should have a working VPN service.
