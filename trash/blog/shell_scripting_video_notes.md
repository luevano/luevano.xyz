title: Shell scripting tutorial video notes
author: David Luévano
lang: en
summary: Notes of videos about shell scripting, as requested by a mentor of mine.
tags: notes
	english

Another summary, this time about shell scripting in general. And just like with the [Linux notes](https://blog.luevano.xyz/a/linux_video_notes), I also did most of the notes myself or with resources outside the video. The videos in question are: [The Bad Tutorials (YT): Shell Scripting Tutorials](https://www.youtube.com/playlist?list=PL7B7FA4E693D8E790) and [Automation with SCripting (YT): Complete Shell Scripting Tutorials](https://www.youtube.com/playlist?list=PL2qzCKTbjutJRM7K_hhNyvf8sfGCLklXw). Also, some notes were taken from [tutorialspoint: UNIX / LINUX Tutorial](https://www.tutorialspoint.com/unix/index.htm) and general googling.

## Basic concepts

A **shell** it's an **interface** between the user and the **kernel**. While the kernel it's the layer that interacts between the shell and the **hardware**. And you access the shell either via a **terminal**, or executing a **shell script**. Note that if you're using a GUI environment, you need a **terminal emulator** to actually use a terminal (most Linux distros come with everything needed, so no need to worry).

When using a terminal a blank screen with some text and a cursor that shows you where to type will appear and depending on the shell being used (`sh`, `dash`, `ksh`, `bash`, `zsh`, `fish`, etc.) the **prompt** will be different. The most common one being of the form `user@host:~$`, which tells that the `user` is using `host` machine and the current working directory is `~` (can be `/any/path/` too), and lastly, the `$` shows the current privileges of the shell/user using the shell (a `$` for normal user and `#` for root access).

To clear the screen use command `clear` or simply do `Ctrl + l` (most terminals let you do this) and to cancel or create a new prompt do `Ctrl + c`, this also cancels any running program that's using the terminal (typing `q` when a program is running also stops the process, sometimes).

Also there are **POSIX** (portable operating system interface) compliant shells like `sh`, `dash`, `ksh`, etc., that have a standard syntax and are portable to any Unix system. Non POSIX compliant shells (or not necessary fully POSIX compliant) are `bash`, `zsh`, `fish`, etc., that provide a more modern syntax but lack speed on executing scripts.

### Common commands/programs

A list of common commands or programs with a short description (for more, do `man command` or `command -h` or `command --help`):

* **`man`: an interface to the system reference manuals.**
* `pwd`: print name of current/working directory.
* `cd`: change the working directory.
* `ls`: list directory contents.
* `echo`: display a line of text. Also, see **escape sequences** ([Bash Prompt HOWTO: Chapter 2. Bash and Bash Prompts: 2.5. Bash Prompt Escape Sequences](https://tldp.org/HOWTO/Bash-Prompt-HOWTO/bash-prompt-escape-sequences.html)).
* `mkdir`: make directories.
* `touch`: change file timestamps (if no file exists, creates a new blank one).
* `cat`: concatenate files and print on the standard output.
* `mv`: move (rename) files.
* `rm`: remove files or directories.
* `rmdir`: remove empty directories.
* `cp`: copy files and directories.
* `ln`: make links between files (hard or soft, also known as symbolic).
* `umask`: get or set the file mode creation mask.
* `chmod`: change file mode bits (change file permissions).
* `chown`: change file owner and group.
* `wc`: print newline, word, and byte counts for each file.
* `file`: determine file type.
* `sort`: sort lines of text files.
* `cut`: remove sections from each line of files.
* `dd`: convert and copy a file (mostly used to make bootable USBs).
* `compress`: compress data.
* `gzip`, `gunzip`, `zcat`: compress or expand files.
* `uname`: print system information.
* `cal`: display a calendar.
* `date`: print or set the system date and time.
* `read`: read from standard input into shell variables (also used to read from a file).
* `tr`: translate or delete characters.
* `readonly`: set the readonly attribute for variables.
* `set`: set or unset options and positional parameters.
* `unset`: unset values and attributes of variables and functions.
* `expr`: evaluate expressions.
* `tput`, `reset`: initialize a terminal or query terminfo database (used for more complex terminal output).
* `grep`, `egrep`, `fgrep`: print lines that match patterns (usually used to find text in a file or some text).
* `sleep`: delay for a specified amount of time.
* `break`: exit from for, while, or until loop.
* `continue`: continue for, while, or until loop.
* `logname`: print user's login name.
* `write`: send a message to another user.
* `mesg`: display (or do not display) messages from other users.
* `return`: return from a function or dot script.
* `exit`: cause the sell to exit.

And some special "commands" or "operators" (for more: [gnu: 3.6 Redirections](https://www.gnu.org/software/bash/manual/html_node/Redirections.html)):

* `|` (pipe): used between two commands and the output from the command from the left serves as input to the command from the right.
* `>`: redirects output to a file, overwriting the file (or creating a new file).
* `>>`: redirects output to a file, appending to the file (or creating a new file).

## Shell scripting

A shell script is nothing more but a file that contains commands in it; they're executed in the same order they are present in the file. A shell script file is usually terminated with a `.sh` extension, independently of the shell being used, but it's not 100% necessary as in Unix systems, an extension mean nothing, other than distinction (visually) between files. Then one can just have an extension-less file as a script. **The script must have execution permissions (`chmod +x file`)**, unless `shell script` is executed in the terminal, where `shell` could be `sh`, `bash`, etc. **Comments** are created by prepending `#` to whatever the text should be a comment.

It's common practice to have the first line as a **she-bang** (`#!`), which is just a comment telling the interpreter which shell to execute the script with (usable when having the script in your **PATH** so you only call the name of the script like any other command/program). A she-bang has the syntax `#!/path/to/shell some_other_options`, the most common she-bangs being: `#!/bin/sh`, `#!/bin/bash`, `#!/usr/bin/python`, etc.

Also, some people argue that you shouldn't use absolute paths, since not all Unix operating systems have the same directory structure, or not all programs are going to be installed in the same folder. So a portable she-bang can be made by prepending `/usr/bin/env` and the specify the program to run, for example: `#!/usr/bin/env bash`.

Like always... the basic "Hello, world!" script:

```sh
#!/bin/sh
echo "Hello, world!"
```

Three ways of executing this script (assuming the file name is `hw`):

1. Type in terminal `sh hw`.
2. Type in terminal `./hw`. Requires the file to have execute permissions.
3. Type in terminal `hw`. Requires the file to have execute permissions. Requires the file to be in your PATH.

### Variables

Variables are case sensitive, meaning that `my_var` and `MY_VAR` are different and a variable name can only contain letters and numbers (`a-z`, `A-Z` and `0-9`) or the underscore character `_`. Can't contain a space. Variables are called by prepending `$` to the variable name.

Like in most programming languages, there are some reserved words like `if`, `select`, `then`, `until`, `while`, etc., that can't be used as variables or as values of variables. For more: [D.2 Index of Shell Reserved Words](https://www.gnu.org/software/bash/manual/html_node/Reserved-Word-Index.html).

There is no need to specify a variable type. Anything surrounded by `"` will be treated as text. You can use booleans, numbers, text and arrays (the implementation of arrays depends on the shell being used). Make a variable readonly by calling `readonly variable_name`. Basic syntax:

* Text variables: `var="my var"`.
* Numeric variables: `var=123`.
* Boolean variables: `var=true` and `var=false`.
* Arrays (assuming `bash` is the shell):
	* `var[0]=value1`, `var[...]=...`, `var[n]=valuen`, etc.
	* `var=(value1 ... valuen)`
	* Access single values with `${var[index]}` and all values with `${var[*]}` or `${var[@]}`.

There are special variables (for more. [tutorialspoint: Unix / Linux - Special Variables](https://www.tutorialspoint.com/unix/unix-special-variables.htm)):

* `$`: represents the process ID number, or PID, of the current shell.
* `0`: the filename of the current script.
* `n`: where `n` can be any whole number, correspond to arguments passed to the script (`command arg1 arg2 arg3 argn`).
* `#:` number of arguments supplied to the script.
* `*:` all the arguments are double quoted.
* `@:` all the arguments are individually double quoted.
* `?:` exit status of the last command executed.
* `!:` process number of the last background command.

When calling a script, you can pass optional (or required) positional arguments like: `command arg1 arg2 arg3 argn`.

Note that a variable can also take the output of another command, one common way to do this is using `$(command)` or `` `command` ``, for example: `var="$(echo 'this is a command being executed inside the definition of a variable')"` which, since the `echo` command is being run, `var="this is a command being executed inside the definition of a variable"`, which doesn't seem like much, but there could be any command inside `$()` or `` `command` ``. Note that this is not special to defining variables, could also be used as arguments of another command.

#### Internal Field Separator (IFS)

This is used by the shell to determine how to do word splitting (how to recognize word boundaries). The default value for `IFS` consists of whitespace characters (space, tab and newline). This value can ve overridden by setting the variable `IFS` to something like, for example, `:`.

### Conditionals

#### Exit status

Any command being run has an exit status, either `0` or `1`, if the command has been executed successfully or otherwise (an error), respectively.

#### `if` statement

Pretty similar to other programming languages, evaluates an expression to a `true` or `false` and executes code as specified. `if` statements can be nested, and follow normal rules of logical operations. Basic syntax is:

```sh
#!/bin/sh
if expression
then
do_something
elif another_expression
then
do_another_thing
else
do_something_else
fi
```

The expression is usually wrapped around `[]` or `[[]]`, the first being POSIX compliant and the second `bash`-specific (and other shells).

Also, some **operators** to compare things use `==` for "equals" and `>` for "greater than", for example; while in a POSIX compliant shell, `=` for "equals" and `-gt` for "greater than" has to be used. For more operators: [tutorialspoint: Unix / Linux - Shell Basic Operators](https://www.tutorialspoint.com/unix/unix-basic-operators.htm) (this also covers **logical operators** and **file test operators**).

### Case statement

A common good alternative to multilevel `if` statements, enables you to match several values against one variable. Basic syntax is:

```sh
case $var in
	pattern1)
		do_something1
		;;
	pattern2)
		subpattern1)
			do_subsomething1
			;;
		subpattern2)
			do_subsomething2
			;;
		*)
	pattern3|pattern4|...|patternN)
		do_something3
		;;
	patternM)
		do_somethingM
		;;
	*)
		do_something_default
		;;
esac
```

Where the `*` pattern is not necessary but serves the same purpose as a "default" case.

### Loops

Loops enable execution of a set of commands repeatedly. Loops, naturally, can be nested. `expression` here (in the basic syntax examples) work the same as mentioned in the "`if` statement" section. For more: [tutorialspoint: Unix / Linux - Shell Loop Types](https://www.tutorialspoint.com/unix/unix-shell-loops.htm).

#### Loop control

Similar than other programming languages, there are loop controls to interrupt or continue a loop:

	* `break` statement.
	* `continue` statement.

These statements accept an argument that specify from which loop to exit/continue.

#### `while` loop

Enables to execute a set of commands repeatedly until some condition occurs. Basic syntax:

```sh
#!/bin/sh
while expression
do
	do_something
done
```

#### `until` loop

Similar to the `while` loop, the difference is that the `while` loop is executed as long as a condition is true, but the `until` loop... until a condition is true. Basic syntax (similar to `while` loop):

```sh
#!/bin/sh
until expression
do
	do_something
done
```

#### `for` loop

Operates on lists of items. It repeats a set of commands for every item in a list. Basic syntax:

```sh
#!/bin/sh
for var in word1 word2 ... wordN
do
	do_something_with_var
done
```

Where `var` is the current value (`word1`, `word2`, etc.) in the loop and the expression after `for` can refer to an array, or the output of a command that outputs a list of things, etc.

#### `select` loop

Provides an easy way to create a numbered menu from which users can select options. Basic syntax (similar to `for` loop):

```sh
select var in word1 word2 ... wordN
do
	do_something_with_var
done
```

### Meta characters

Meta characters are used to execute several commands on a single line (depending on what it's needed). The most used meta characters to accomplish this are semi-colon `;`, double ampersand `&&` and double "pipe" `||`.

* `;`: is used to finish one command (similar to some programming languages), after the command on the left of `;` is finished (whatever the exit code is), the command on the right will be executed.
* `&&`: similar to `;`, but only if the command on the left exits with code `0` (success).
* `||`: similar to `&&`, but for exit code `1`(error).

### Functions

Enable to break down the overall functionality of a script into smaller, logical subsections, which can then be called upon to perform their individual tasks when needed (like in any other programming language...). For more: [tutorialspoint: Unix / Linux - Shell Functions](https://www.tutorialspoint.com/unix/unix-shell-functions.htm). Basic syntax:

```sh
#!/bin/sh
function_name () {
	do_something
}
```

Functions can also take arguments and can access their individual arguments (each function will have a different "storage" for their arguments). Functions can also be nested. Here `exit` will not only will finish the function code, but also the shell script that called it, instead use `return` plus an exit code to just exit the function.
