/**
 * Pianola
 *
 * @author  Shushik <silkleopard@yandex.ru>
 * @version α
 */
var Pianola = Pianola || (function() {

    /**
     * @constructor
     *
     * @property document
     * @property parent
     * @function _proxy
     *
     * @param {string}           target
     * @param {undefined|object} params
     */
    function
        self(target, params) {
            if (!(this instanceof self)) {
                return new self(target, params);
            }

            params = typeof params == 'object' ? params : {};

            // Get a node by its CSS path
            if (typeof target === 'string') {
                target = self.document.body.querySelector(target);
            }

            // 
            if (!(target instanceof Node)) {
                return;
            }

            // Set instance default values
            this._loop    = -1;
            this._cursor  = 0;
            this._notes   = null;
            this._octaves = null;
            this.target   = target;

            // Cache main arguments
            this.args = {
                large    : params.large === true ? true : false,
                signs    : params.signs === true ? true : false,
                octaves  : typeof params.octaves == 'number' ? params.octaves : 9,
                readonly : params.readonly === false ? false : true
            };
    
            if (this.args.octaves < 0) {
                this.args.octaves = 1;
            }
            
            if (this.args.octaves > 9) {
                this.args.octaves = 9;
            }

            // Create the player object
            this._player = {
                group  : 0,
                timer  : null,
                groups : null
            };

            // Cache the proxied methods links
            this._proxied = {
                rewind : self._proxy(this.rewind, this)
            };

            // Build the keyboard
            this.draw();
        }

    /**
     * Instance properties and methods
     *
     * @property _loop
     * @property _notes
     * @property _cursor
     * @property _player
     * @property _octaves
     * @property _proxied
     * @property args
     * @property target
     * @function draw
     * @function seek
     * @function take
     * @function free
     * @function save
     * @function play
     * @function stop
     * @function pause
     * @function rewind
     */
    self.prototype = {
        /**
         * Common loop counter
         *
         * @private
         *
         * @type {number}
         */
        _loop : -1,
        /**
         * Common cursor zero position
         *
         * @private
         *
         * @type {number}
         */
        _cursor : 0,
        /**
         * Links to all notes nodes
         *
         * @private
         *
         * @type {object}
         */
        _notes : null,
        /**
         * Player properties
         *
         * @private
         *
         * @type {object}
         */
        _player : null,
        /**
         * Links to all octaves nodes
         *
         * @private
         *
         * @type {object}
         */
        _octaves : null,
        /**
         * Links for the proxied methods
         *
         * @private
         *
         * @type {object}
         */
        _proxied : null,
        /**
         * User given arguments
         *
         * @private
         *
         * @type {object}
         */
        args : null,
        /**
         * Target DOM node
         *
         * @type {object}
         */
        target : null,
        /**
         * Build the keyboard
         */
        draw : function() {
            var
                single  = this.args.octaves === 1 ? true : false,
                it0     = 0,
                it1     = 0,
                ln0     = single ? 2 : this.args.octaves,
                ln1     = 12;
                tag     = 'kbd',
                list    = 'C B♯,C♯ D♭,D,D♯ E♭,E F♭,F E♯,F♯ G♭,G,G♯ A♭,A,A♯ B♭,B C♭',
                note    = null,
                temp    = null,
                notes   = self.document.createElement(tag),
                piano   = self.document.createElement(tag),
                octave  = null,
                octaves = {
                              '0' : 'I',
                              '1' : 'II',
                              '2' : 'S',
                              '3' : 'III',
                              '4' : 'G',
                              '5' : 'IV',
                              '6' : 'C',
                              '7' : 'V',
                              '8' : 'SC'
                          };

            // Create an elements for main wrapper and keyboard
            piano.className = 'pianola' +
                              (this.args.large ? ' large' : '') + 
                              (this.args.signs ? ' signs' : '');
            notes.className = 'notes';

            for (; it0 < ln0; it0++) {
                // Create an element for octave
                octave = self.document.createElement(tag);
                octave.className = 'octave ' + octaves[it0];

                // Get the notes for the octave
                if (it0 == 7 || single && it0 == 1) {
                    tmp = list.substring(0, 1);
                } else if (it0 == 8) {
                    tmp = list.substring(43);
                } else {
                    tmp = list;
                }

                // Get notes for the keyboard
                tmp = tmp.split(',');
                ln1 = tmp.length;

                for (it1 = 0; it1 < ln1; it1++) {
                    note = self.document.createElement(tag);
                    note.className = 'note ' + tmp[it1];
                    octave.appendChild(note);
                }

                // Insert the ready octave
                if (it0 > 0 && it0 % 2) {
                    notes.appendChild(octave);
                } else {
                    notes.insertBefore(octave, notes.firstChild);

                    // Count the keyboard cursor without the first octave
                    if (it0 > 0 && ln1 > 3) {
                        this._cursor += ln1;
                    }
                }
            }

            // Save the main wrapper and the keyboard
            piano.appendChild(notes);
            this.target.innerHTML = '';
            this.target.appendChild(piano);

            // Save links to octaves and notes nodes
            this._notes   = Array.prototype.slice.
                            call(this.target.querySelectorAll('.note'));
            this._octaves = Array.prototype.slice.
                            call(this.target.querySelectorAll('.octave'));
        },
        /**
         * Search a note node index by the note name
         *
         * @param {string} note
         *
         * @return {number}
         */
        seek : function(note) {
            var
                it0 = this._notes.length;

            while (--it0 > -1) {
                if (this._notes[it0] == note) {
                    return it0;
                }
            }

            return -1;
        },
        /**
         * Take a note(s)
         *
         * @param {number|string|object}
         * @param {number|string}
         * ...
         * @param {number|string}
         *
         * @return {object}
         */
        take : function() {
            var
                it0    = -1,
                note   = '',
                notes  = null,
                search = null;

            if (arguments[0] instanceof Node) {
                // Get a node's position
                notes = [this.seek(arguments[0])];
            } else if (arguments[0] instanceof Array) {
                // Get notes from the array
                notes = arguments[0].slice();
            } else {
                // Get notes from the function arguments
                notes = Array.prototype.slice.call(arguments);
            }

            // «Take» chosen keys on the keyboard
            while (++it0 < notes.length) {
                note = notes[it0];

                // Translate a note name into a key number
                if (typeof note == 'string') {
                    search = new RegExp('\\s' + note + '(\\s|$)');
    
                    while (++this._loop < this._notes.length) {
                        if (this._notes[this._loop].className.match(search)) {
                            notes[it0] = this._cursor + this._loop;
                            break;
                        }
                    }
                }

                // Activate chosen notes
                this._notes[notes[it0]].className += ' active';
            }

            // 
            if (!this._player.timer) {
                this._loop = -1;
            }

            return notes;
        },
        /**
         * Free all taken notes
         *
         * @param {number|string|object}
         * @param {number|string}
         * ...
         * @param {number|string}
         *
         * @return {object}
         */
        free : function() {
            var
                it0    = 0,
                note   = 0,
                change = /\sactive/,
                node   = null,
                nodes  = null,
                notes  = null;

            if (arguments[0] instanceof Node) {
                // Get a node's position
                notes = [this.seek(arguments[0])];
            } else if (arguments[0] instanceof Array) {
                // Get notes from the array
                notes = arguments[0].slice();
            } else {
                // Get notes from the function arguments
                notes = Array.prototype.slice.call(arguments);
            }

            if (it0 = notes.length) {
                // Release selected notes only
                while (--it0 > -1) {
                    note = notes[it0];
    
                    if (typeof note == 'string') {
                        // By key name
                        node = Array.prototype.slice.call(
                                   this.target.querySelectorAll('.note.' + note + '.active')
                               ).pop();
                    } else {
                        // By key index
                        node = this._notes[note];
                    }

                    node.className = node.className.replace(change, '');
                }
            } else {
                // Release all notes
                nodes = this.target.querySelectorAll('.note.active');
                it0   = nodes.length;

                while (--it0 > -1) {
                    node = nodes[it0];

                    node.className = node.className.replace(change, '');
                }
            }
        },
        /**
         * Save the frames into animation stack
         *
         * @param {object}           frames
         * @param {undefined|object} params
         *
         * @return {object}
         */
        save : function(frames, params) {
            params = typeof params == 'object' ? params : {};

            var
                it0   = -1,
                frame = null,
                group = null;

            //
            if (frames === null) {
                frames = [null];
            }

            // Read and save frames
            if (frames instanceof Array) {
                group = {
                    delay  : 500,
                    frame  : 0,
                    repeat : 0,
                    frames : []
                };

                // Create groups array if not exists
                if (!this._player.groups) {
                    this._player.groups = [];
                }

                // Turn the sustain on
                if (params.sustain === true) {
                    group.sustain = true;
                }

                // Set the custom delay for the timer
                if (typeof params.delay == 'number' && params.delay > 0) {
                    group.delay = params.delay * 1000;
                }

                // Set the number of times frames should be played
                if (params.repeat) {
                    if (typeof params.repeat == 'number' && params.repeat > 0) {
                        group.repeat = params.repeat - 1;
                    } else if (params.repeat === true) {
                        group.repeat = true;
                    }
                }

                // Save the frames
                while (++it0 < frames.length) {
                    frame = frames[it0];

                    if (frame instanceof Array) {
                        // Frames given as an array
                        group.frames.push(frame.slice());
                    } else if (typeof frame == 'string') {
                        // Frames given as a string
                        group.frames.push(frame.split(','));
                    } else if (frame === null) {
                        group.frames.push(frame);
                    } else {
                        // Not suitable format given
                        this.stop();
                        return this;
                    }
                }

                this._player.groups.push(group);
            }

            // Chaining
            return this;
        },
        /**
         * Start the animation
         *
         * @return {object}
         */
        play : function() {
            // Start or resume playing
            if (!this._player.timer) {
                this.rewind();

                this._player.timer = setInterval(
                    this._proxied.rewind,
                    this._player.groups[0].delay
                );
            }

            // Chaining
            return this;
        },
        /**
         * Stop the animation
         *
         * @return {object}
         */
        stop : function() {
            this.pause();
            this.free();

            this._player.group  = 0;
            this._player.timer  = null;
            this._player.groups = null;

            // Chaining
            return this;
        },
        /**
         * Pause the animation
         *
         * @return {object}
         */
        pause : function() {
            // Switch off the timer
            if (this._player.timer) {
                clearInterval(this._player.timer);
    
                this.free();
    
                this._loop = -1;
            }
    
            // Chaining
            return this;
        },
        /**
         * Play a current frame in a current group
         *
         * @return {object}
         */
        rewind : function() {
            var
                type  = '',
                group = null,
                frame = null;

            // 
            if (this._player.group == this._player.groups.length) {
                this.stop();

                return this;
            }

            // Read group properties
            group = this._player.groups[this._player.group];

            // Free all token keys
            if (!group.sustain) {
                this.free();
            }

            // Switch to the next group or repeat its frames
            if (group.frame == group.frames.length || group.frames[0] === null) {
                this._loop = -1;

                if (group.repeat) {
                    // Check if the limit is exceeded
                    group.frame = 0;

                    // Not infinite cycle
                    if (typeof group.repeat == 'number') {
                        group.repeat--;
                    }
                } else {
                    clearInterval(this._player.timer);

                    // Reset the timer and switch to the next group
                    this._player.group++;

                    // 
                    group = this._player.groups[this._player.group];

                    // 
                    if (group) {
                        this._player.timer = setInterval(
                            this._proxied.rewind,
                            group.delay
                        );
                    } else {
                        this.stop();
                    }
                }

                return this;
            }

            // Get the current frame and switch to the next one
            frame = group.frames[group.frame];
            group.frame++;

            // Take all the frame's notes
            if (frame) {
                this.take(frame);
            }

            // Chaining
            return this;
        }
    }

    /**
     * Cached link for the Document object
     *
     * @static
     *
     * @type {object}
     */
    self.document = this.document;

    /**
     * Cached link for the Window object
     *
     * @static
     *
     * @type {object}
     */
    self.parent = this;

    /**
     * Run a function in a given context
     *
     * @static
     * @private
     *
     * @param {function} fn
     * @param {object}   ctx
     *
     * @return {function}
     */
    self._proxy = function(fn, ctx) {
        var
            args = Array.prototype.slice.call(arguments, 2);

        return function() {
            return fn.apply(ctx, [].concat(
                args,
                Array.prototype.slice.call(arguments)
            ));
        }
    }

    return self;

})();