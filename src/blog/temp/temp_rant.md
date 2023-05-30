Bullshit I needed to install for the "headless" browser for mangal (and respective arch linux package):

- libnss3.so -> nss
- libatk-1.0.so.0 -> at-spi2-core
- libcups.so.2 -> libcups
- libdrm.so.2 -> libdrm
- libXcomposite.so.1 -> libxcomposite
- libXdamage.so.1 -> libxdamage
- libXrandr.so.2 -> libxrandr
- libgbm.so.1 -> mesa
- libxkbcommon.so.0 -> libxkbcommon
- libpango-1.0.so.0 -> pango
- libasound.so.2 -> alsa-lib

```sh
pacman -S nss at-spi2-core libcups libdrm libxcomposite libxdamage libxrandr mesa libxkbcommon pango alsa-lib
```

Actual missing at ezclap.xyz:

```sh
sudo pacman -S at-spi2-core libxcomposite libxrandr pango alsa-lib
```

Which are probably met by installing either `chromedriver` or `google-chrome` from the AUR, but no thanks, they install some extra shit.