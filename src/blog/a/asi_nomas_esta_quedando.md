title: Así nomás está quedando el página
author: David Luévano
lang: es
summary: Actualización en el estado de la página, el servidor de XMPP y Matrix que me acomodé y próximas cosas que quiero hacer.
tags: short
	update
	spanish

Estuve acomodando un poco más el *sItIo*, al fin agregué la "sección" de [contact](https://luevano.xyz/contact.html) y de [donate](https://luevano.xyz/donate.html) por si hay algún loco que quiere tirar varo.

También me puse a acomodar un servidor de [XMPP](https://xmpp.org/) el cual, en pocas palabras, es un protocolo de mensajería instantánea (y más) descentralizado, por lo cual cada quien puede hacer una cuenta en el servidor que quiera y conectarse con cuentas creadas en otro servidor... exacto, como con los correos electrónicos. Y esto está perro porque si tú tienes tu propio server, así como con uno de correo electrónico, puedes controlar qué características tiene, quiénes pueden hacer cuenta, si hay *end-to-end encryption* (o mínimo *end-to-server*), entre un montón de otras cosas.

Ahorita este server es SUMISO (*compliant* en español, jeje) para jalar con la app [conversations](https://conversations.im/) y con la red social [movim](https://movim.eu/), pero realmente funcionaría con casi cualquier cliente de XMPP, amenos que ese cliente implemente algo que no tiene mi server. Y también acomodé un server de [Matrix](https://matrix.org/) que es muy similar pero es bajo otro protocolo y se siente más como un discord/slack (al menos en el [element](https://element.io/)), muy chingón también.

Si bien aún quedan cosas por hacer sobre estos dos servers que me acomodé (además de hacerles unas entradas para documentar cómo lo hice), quiero moverme a otra cosa que sería acomodar una sección de dibujos, lo cual en teoría es bien sencillo, pero como quiero poder automatizar la publicación de estos, quiero modificar un poco el [`pyssg`](${PYSSG_URL}) para que jale chido para este pex.

Ya por último también quiero moverle un poco al CSS, porque lo dejé en un estado muy culerón y quiero meterle/ajustar unas cosas para que quede más limpio y medianamente bonito... *dentro de lo que cabe porque evidentemente me vale verga si se ve como una página del 2000*.

**Actualización**: Ya tumbé el servidor de XMPP porque consumía bastantes recursos y no lo usaba tanto, si en un futuro consigo un mejor servidor podría volver a hostearlo.