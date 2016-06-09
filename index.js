/* =========================================================
 * bootstrap-datepicker.js
 * Repo: https://github.com/eternicode/bootstrap-datepicker/
 * Demo: https://eternicode.github.io/bootstrap-datepicker/
 * Docs: https://bootstrap-datepicker.readthedocs.org/
 * Forked from http://www.eyecon.ro/bootstrap-datepicker
 * =========================================================
 * Started by Stefan Petre; improvements by Andrew Rowls + contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * ========================================================= */
'use strict';


let DPGlobal = {};
const localeOpts = [
    'format',
    'rtl',
    'weekStart',
];

const dates = {
    en: {
        days: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        daysShort: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
        daysMin: ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'],
        months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
        monthsShort: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        today: 'Today',
        clear: 'Clear',
        titleFormat: 'MM yyyy',
    },
};


let defaults = {
    assumeNearbyYear: false,
    autoclose: false,
    beforeShowDay: $.noop,
    beforeShowMonth: $.noop,
    beforeShowYear: $.noop,
    beforeShowDecade: $.noop,
    beforeShowCentury: $.noop,
    calendarWeeks: false,
    clearBtn: false,
    toggleActive: false,
    daysOfWeekDisabled: [],
    daysOfWeekHighlighted: [],
    datesDisabled: [],
    endDate: Infinity,
    forceParse: true,
    format: 'mm/dd/yyyy',
    keepEmptyValues: false,
    keyboardNavigation: true,
    language: 'en',
    minViewMode: 0,
    maxViewMode: 4,
    multidate: false,
    multidateSeparator: ',',
    orientation: 'auto',
    rtl: false,
    startDate: -Infinity,
    startView: 0,
    todayBtn: false,
    todayHighlight: false,
    weekStart: 0,
    disableTouchKeyboard: false,
    enableOnReadonly: true,
    showOnFocus: true,
    zIndexOffset: 10,
    container: 'body',
    immediateUpdates: false,
    dateCells: false,
    title: '',
    templates: {
        leftArrow: '&laquo;',
        rightArrow: '&raquo;',
    },
};


function UTCDate() {
    return new Date(Date.UTC.apply(Date, arguments));
}


function UTCToday() {
    var today = new Date();
    return UTCDate(today.getFullYear(), today.getMonth(), today.getDate());
}


function isUTCEquals(date1, date2) {
    return (
        date1.getUTCFullYear() === date2.getUTCFullYear() &&
        date1.getUTCMonth() === date2.getUTCMonth() &&
        date1.getUTCDate() === date2.getUTCDate()
    );
}


function alias(method) {
    return function() {
        return this[method].apply(this, arguments);
    };
}


function isValidDate(d) {
    return d && !isNaN(d.getTime());
}


let DateArray = (function() {
    var extras = {
        get: function(i) {
            return this.slice(i)[0];
        },
        contains: function(d) {
            // Array.indexOf is not cross-browser;
            // $.inArray doesn't work with Dates
            var val = d && d.valueOf();
            for (let i = 0, l = this.length; i < l; i++) {
                if (this[i].valueOf() - val >= 0 && this[i].valueOf() - val < 1000 * 60 * 60 * 24) {
                    return i;
                }
            }
            // Use date arithmetic to allow dates with different times to match
            return -1;
        },
        remove: function(i) {
            this.splice(i, 1);
        },
        replace: function(newArray) {
            if (!newArray) {
                return;
            }
            if (!$.isArray(newArray)) {
                newArray = [newArray];
            }
            this.clear();
            this.push.apply(this, newArray);
        },
        clear: function() {
            this.length = 0;
        },
        copy: function() {
            var a = new DateArray();
            a.replace(this);
            return a;
        },
    };

    return function() {
        var a = [];
        a.push.apply(a, arguments);
        $.extend(a, extras);
        return a;
    };
})();


class Datepicker {

    constructor(element, options) {
        $(element).data('datepicker', this);
        this._processOptions(options);

        this.dates = new DateArray();
        this.viewDate = this.o.defaultViewDate;
        this.focusDate = null;

        this.element = $(element);
        this.isInput = this.element.is('input');
        this.inputField = this.isInput ? this.element : this.element.find('input');
        this.component = this.element.hasClass('date') ? this.element.find('.add-on, .input-group-addon, .btn') : false;
        this.hasInput = this.component && this.inputField.length;
        if (this.component && this.component.length === 0) {
            this.component = false;
        }

        this.isInline = !this.component && this.element.is('div');

        this.picker = $(DPGlobal.template);

        // Checking templates and inserting
        if (this._checkTemplate(this.o.templates.leftArrow)) {
            this.picker.find('.prev').html(this.o.templates.leftArrow);
        }
        if (this._checkTemplate(this.o.templates.rightArrow)) {
            this.picker.find('.next').html(this.o.templates.rightArrow);
        }

        this._buildEvents();
        this._attachEvents();

        if (this.isInline) {
            this.picker.addClass('datepicker-inline').appendTo(this.element);
        } else {
            this.picker.addClass('datepicker-dropdown dropdown-menu');
        }

        if (this.o.rtl) {
            this.picker.addClass('datepicker-rtl');
        }

        this.viewMode = this.o.startView;

        if (this.o.calendarWeeks) {
            this.picker.find('thead .datepicker-title, tfoot .today, tfoot .clear').attr('colspan', function(i, val) {
                return parseInt(val, 10) + 1;
            });
        }

        this._allow_update = false;

        this.setStartDate(this._o.startDate);
        this.setEndDate(this._o.endDate);
        this.setDaysOfWeekDisabled(this.o.daysOfWeekDisabled);
        this.setDaysOfWeekHighlighted(this.o.daysOfWeekHighlighted);
        this.setDatesDisabled(this.o.datesDisabled);

        this.fillDow();
        this.fillMonths();

        this._allow_update = true;

        this.update();
        this.showMode();

        if (this.isInline) {
            this.show();
        }
    }


    _resolveViewName(view, defaultValue) {
        if (view === 0 || view === 'days' || view === 'month') {
            return 0;
        }
        if (view === 1 || view === 'months' || view === 'year') {
            return 1;
        }
        if (view === 2 || view === 'years' || view === 'decade') {
            return 2;
        }
        if (view === 3 || view === 'decades' || view === 'century') {
            return 3;
        }
        if (view === 4 || view === 'centuries' || view === 'millennium') {
            return 4;
        }
        return defaultValue === undefined ? false : defaultValue;
    }


    _checkTemplate(tmp) {
        try {
            // If empty
            if (tmp === undefined || tmp === '') {
                return false;
            }
            // If no html, everything ok
            if ((tmp.match(/[<>]/g) || []).length <= 0) {
                return true;
            }
            // Checking if html is fine
            let jDom = $(tmp);
            return jDom.length > 0;
        } catch (ex) {
            return false;
        }
    }


    _processOptions(opts) {
        // Store raw options for reference
        this._o = $.extend({}, this._o, opts);
        // Processed options
        let o = this.o = $.extend({}, this._o);

        // Check if "de-DE" style date is available, if not language should
        // fallback to 2 letter code eg "de"
        let lang = o.language;
        if (!dates[lang]) {
            lang = lang.split('-')[0];
            if (!dates[lang]) {
                lang = defaults.language;
            }
        }
        o.language = lang;

        // Retrieve view index from any aliases
        o.startView = this._resolveViewName(o.startView, 0);
        o.minViewMode = this._resolveViewName(o.minViewMode, 0);
        o.maxViewMode = this._resolveViewName(o.maxViewMode, 4);

        // Check that the start view is between min and max
        o.startView = Math.min(o.startView, o.maxViewMode);
        o.startView = Math.max(o.startView, o.minViewMode);

        // true, false, or Number > 0
        if (o.multidate !== true) {
            o.multidate = Number(o.multidate) || false;
            if (o.multidate !== false) {
                o.multidate = Math.max(0, o.multidate);
            }
        }
        o.multidateSeparator = String(o.multidateSeparator);

        o.weekStart %= 7;
        o.weekEnd = (o.weekStart + 6) % 7;

        let format = DPGlobal.parseFormat(o.format);
        if (o.startDate !== -Infinity) {
            if (!!o.startDate) {
                if (o.startDate instanceof Date) {
                    o.startDate = this._localToUtc(this._zeroTime(o.startDate));
                } else {
                    o.startDate = DPGlobal.parseDate(o.startDate, format, o.language, o.assumeNearbyYear);
                }
            } else {
                o.startDate = -Infinity;
            }
        }
        if (o.endDate !== Infinity) {
            if (!!o.endDate) {
                if (o.endDate instanceof Date) {
                    o.endDate = this._localToUtc(this._zeroTime(o.endDate));
                } else {
                    o.endDate = DPGlobal.parseDate(o.endDate, format, o.language, o.assumeNearbyYear);
                }
            } else {
                o.endDate = Infinity;
            }
        }

        o.daysOfWeekDisabled = o.daysOfWeekDisabled || [];
        if (!$.isArray(o.daysOfWeekDisabled)) {
            o.daysOfWeekDisabled = o.daysOfWeekDisabled.split(/[,\s]*/);
        }
        o.daysOfWeekDisabled = $.map(o.daysOfWeekDisabled, function(d) {
            return parseInt(d, 10);
        });

        o.daysOfWeekHighlighted = o.daysOfWeekHighlighted || [];
        if (!$.isArray(o.daysOfWeekHighlighted)) {
            o.daysOfWeekHighlighted = o.daysOfWeekHighlighted.split(/[,\s]*/);
        }
        o.daysOfWeekHighlighted = $.map(o.daysOfWeekHighlighted, function(d) {
            return parseInt(d, 10);
        });

        o.datesDisabled = o.datesDisabled || [];
        if (!$.isArray(o.datesDisabled)) {
            o.datesDisabled = [
                o.datesDisabled,
            ];
        }
        o.datesDisabled = $.map(o.datesDisabled, function(d) {
            return DPGlobal.parseDate(d, format, o.language, o.assumeNearbyYear);
        });

        let plc = String(o.orientation).toLowerCase().split(/\s+/g);
        let _plc = o.orientation.toLowerCase();
        plc = $.grep(plc, function(word) {
            return /^auto|left|right|top|bottom$/.test(word);
        });
        o.orientation = {x: 'auto', y: 'auto'};
        if (!_plc || _plc === 'auto') {
            // no action
        } else if (plc.length === 1) {
            switch (plc[0]) {
            case 'top':
            case 'bottom':
                o.orientation.y = plc[0];
                break;
            case 'left':
            case 'right':
                o.orientation.x = plc[0];
                break;
            }
        } else {
            _plc = $.grep(plc, function(word) {
                return /^left|right$/.test(word);
            });
            o.orientation.x = _plc[0] || 'auto';

            _plc = $.grep(plc, function(word) {
                return /^top|bottom$/.test(word);
            });
            o.orientation.y = _plc[0] || 'auto';
        }
        if (o.defaultViewDate) {
            let year = o.defaultViewDate.year || new Date().getFullYear();
            let month = o.defaultViewDate.month || 0;
            let day = o.defaultViewDate.day || 1;
            o.defaultViewDate = UTCDate(year, month, day);
        } else {
            o.defaultViewDate = UTCToday();
        }
    }


    _applyEvents(evs) {
        for (let i = 0, el, ch, ev; i < evs.length; i++) {
            el = evs[i][0];
            if (evs[i].length === 2) {
                ch = undefined;
                ev = evs[i][1];
            } else if (evs[i].length === 3) {
                ch = evs[i][1];
                ev = evs[i][2];
            }
            el.on(ev, ch);
        }
    }


    _unapplyEvents(evs) {
        for (let i = 0, el, ev, ch; i < evs.length; i++) {
            el = evs[i][0];
            if (evs[i].length === 2) {
                ch = undefined;
                ev = evs[i][1];
            } else if (evs[i].length === 3) {
                ch = evs[i][1];
                ev = evs[i][2];
            }
            el.off(ev, ch);
        }
    }


    _buildEvents() {
        var events = {
            keyup: $.proxy(function(e) {
                if ($.inArray(e.keyCode, [27, 37, 39, 38, 40, 32, 13, 9]) === -1) {
                    this.update();
                }
            }, this),
            keydown: $.proxy(this.keydown, this),
            paste: $.proxy(this.paste, this),
        };

        if (this.o.showOnFocus === true) {
            events.focus = $.proxy(this.show, this);
        }

        if (this.isInput) { // single input
            this._events = [
                [this.element, events],
            ];
        } else if (this.component && this.hasInput) { // component: input + button
            this._events = [
                // For components that are not readonly, allow keyboard nav
                [this.inputField, events],
                [this.component, {
                    click: $.proxy(this.show, this),
                }],
            ];
        } else {
            this._events = [
                [this.element, {
                    click: $.proxy(this.show, this),
                    keydown: $.proxy(this.keydown, this),
                }],
            ];
        }
        this._events.push(
            // Component: listen for blur on element descendants
            [this.element, '*', {
                blur: $.proxy(function(e) {
                    this._focused_from = e.target;
                }, this),
            }],
            // Input: listen for blur on element
            [this.element, {
                blur: $.proxy(function(e) {
                    this._focused_from = e.target;
                }, this),
            }]
        );

        if (this.o.immediateUpdates) {
            // Trigger input updates immediately on changed year/month
            this._events.push([this.element, {
                'changeYear changeMonth': $.proxy(function(e) {
                    this.update(e.date);
                }, this),
            }]);
        }

        this._secondaryEvents = [
            [this.picker, {
                click: $.proxy(this.click, this),
            }],
            [$(window), {
                resize: $.proxy(this.place, this),
            }],
            [$(document), {
                mousedown: $.proxy(function(e) {
                    // Clicked outside the datepicker, hide it
                    if (!(
                        this.element.is(e.target) ||
                        this.element.find(e.target).length ||
                        this.picker.is(e.target) ||
                        this.picker.find(e.target).length ||
                        this.isInline
                    )) {
                        this.hide();
                    }
                }, this),
            }],
        ];
    }


    _attachEvents() {
        this._detachEvents();
        this._applyEvents(this._events);
    }


    _detachEvents() {
        this._unapplyEvents(this._events);
    }


    _attachSecondaryEvents() {
        this._detachSecondaryEvents();
        this._applyEvents(this._secondaryEvents);
    }


    _detachSecondaryEvents() {
        this._unapplyEvents(this._secondaryEvents);
    }


    _trigger(event, altdate) {
        var date = altdate || this.dates.get(-1);
        var localDate = this._utcToLocal(date);

        this.element.trigger({
            type: event,
            date: localDate,
            dates: $.map(this.dates, this._utcToLocal),
            format: $.proxy(function(ix, format) {
                if (arguments.length === 0) {
                    ix = this.dates.length - 1;
                    format = this.o.format;
                } else if (typeof ix === 'string') {
                    format = ix;
                    ix = this.dates.length - 1;
                }
                format = format || this.o.format;
                return DPGlobal.formatDate(this.dates.get(ix), format, this.o.language);
            }, this),
        });
    }


    show() {
        if (this.inputField.prop('disabled') || (this.inputField.prop('readonly') && this.o.enableOnReadonly === false)) {
            return;
        }
        if (!this.isInline) {
            this.picker.appendTo(this.o.container);
        }
        this.place();
        this.picker.show();
        this._attachSecondaryEvents();
        this._trigger('show');
        if ((window.navigator.msMaxTouchPoints || 'ontouchstart' in document) && this.o.disableTouchKeyboard) {
            $(this.element).blur();
        }
        return this;
    }


    hide() {
        if (this.isInline || !this.picker.is(':visible')) {
            return this;
        }
        this.focusDate = null;
        this.picker.hide().detach();
        this._detachSecondaryEvents();
        this.viewMode = this.o.startView;
        this.showMode();

        if (this.o.forceParse && this.inputField.val()) {
            this.setValue();
        }
        this._trigger('hide');
        return this;
    }


    destroy() {
        this.hide();
        this._detachEvents();
        this._detachSecondaryEvents();
        this.picker.remove();
        delete this.element.data().datepicker;
        if (!this.isInput) {
            delete this.element.data().date;
        }
        return this;
    }


    paste(evt) {
        var dateString;
        if (evt.originalEvent.clipboardData && evt.originalEvent.clipboardData.types
            && $.inArray('text/plain', evt.originalEvent.clipboardData.types) !== -1) {
            dateString = evt.originalEvent.clipboardData.getData('text/plain');
        } else if (window.clipboardData) {
            dateString = window.clipboardData.getData('Text');
        } else {
            return;
        }
        this.setDate(dateString);
        this.update();
        evt.preventDefault();
    }


    _utcToLocal(utc) {
        return utc && new Date(utc.getTime() + (utc.getTimezoneOffset() * 60000));
    }


    _localToUtc(local) {
        return local && new Date(local.getTime() - (local.getTimezoneOffset() * 60000));
    }


    _zeroTime(local) {
        return local && new Date(local.getFullYear(), local.getMonth(), local.getDate());
    }


    _zeroUtcTime(utc) {
        return utc && new Date(Date.UTC(utc.getUTCFullYear(), utc.getUTCMonth(), utc.getUTCDate()));
    }


    getDates() {
        return $.map(this.dates, this._utcToLocal);
    }


    getUTCDates() {
        return $.map(this.dates, function(d) {
            return new Date(d);
        });
    }


    getDate() {
        return this._utcToLocal(this.getUTCDate());
    }


    /**
     * Return the currently used internal date.
     */
    getUTCDate() {
        var selectedDate = this.dates.get(-1);
        if (typeof selectedDate !== 'undefined') {
            return new Date(selectedDate);
        }
        throw new Error('this.dates should be set!');
    }


    clearDates() {
        if (this.inputField) {
            this.inputField.val('');
        }

        this.update();
        this._trigger('changeDate');

        if (this.o.autoclose) {
            this.hide();
        }
    }


    setDates() {
        var args = $.isArray(arguments[0]) ? arguments[0] : arguments;
        this.update.apply(this, args);
        this._trigger('changeDate');
        this.setValue();
        return this;
    }


    setUTCDates() {
        var args = $.isArray(arguments[0]) ? arguments[0] : arguments;
        this.update.apply(this, $.map(args, this._utcToLocal));
        this._trigger('changeDate');
        this.setValue();
        return this;
    }


    setValue() {
        var formatted = this.getFormattedDate();
        this.inputField.val(formatted);
        return this;
    }


    getFormattedDate(format) {
        if (format === undefined) {
            format = this.o.format;
        }

        return $.map(this.dates, (d) => {
            return DPGlobal.formatDate(d, format, this.o.language);
        }).join(this.o.multidateSeparator);
    }


    getStartDate() {
        return this.o.startDate;
    }


    setStartDate(startDate) {
        this._processOptions({startDate: startDate});
        this.update();
        this.updateNavArrows();
        return this;
    }


    getEndDate() {
        return this.o.endDate;
    }


    setEndDate(endDate) {
        this._processOptions({endDate: endDate});
        this.update();
        this.updateNavArrows();
        return this;
    }


    setDaysOfWeekDisabled(daysOfWeekDisabled) {
        this._processOptions({daysOfWeekDisabled: daysOfWeekDisabled});
        this.update();
        this.updateNavArrows();
        return this;
    }


    setDaysOfWeekHighlighted(daysOfWeekHighlighted) {
        this._processOptions({daysOfWeekHighlighted: daysOfWeekHighlighted});
        this.update();
        return this;
    }


    setDatesDisabled(datesDisabled) {
        this._processOptions({datesDisabled: datesDisabled});
        this.update();
        this.updateNavArrows();
        return this;
    }


    place() {
        if (this.isInline) {
            return this;
        }
        let calendarWidth = this.picker.outerWidth();
        let calendarHeight = this.picker.outerHeight();
        let visualPadding = 10;
        let container = $(this.o.container);
        let windowWidth = container.width();
        let scrollTop = this.o.container === 'body' ? $(document).scrollTop() : container.scrollTop();
        let appendOffset = container.offset();

        let parentsZindex = [];
        this.element.parents().each(function() {
            let itemZIndex = $(this).css('z-index');
            if (itemZIndex !== 'auto' && itemZIndex !== 0) {
                parentsZindex.push(parseInt(itemZIndex, 10));
            }
        });
        let zIndex = Math.max.apply(Math, parentsZindex) + this.o.zIndexOffset;
        let offset = this.component ? this.component.parent().offset() : this.element.offset();
        let height = this.component ? this.component.outerHeight(true) : this.element.outerHeight(false);
        let width = this.component ? this.component.outerWidth(true) : this.element.outerWidth(false);
        let left = offset.left - appendOffset.left;
        let top = offset.top - appendOffset.top;

        if (this.o.container !== 'body') {
            top += scrollTop;
        }

        this.picker.removeClass('datepicker-orient-top datepicker-orient-bottom datepicker-orient-right datepicker-orient-left');

        if (this.o.orientation.x !== 'auto') {
            this.picker.addClass('datepicker-orient-' + this.o.orientation.x);
            if (this.o.orientation.x === 'right') {
                left -= calendarWidth - width;
            }
        } else {
            // auto x orientation is best-placement: if it crosses a window
            // edge, fudge it sideways
            if (offset.left < 0) {
                // component is outside the window on the left side. Move it into visible range
                this.picker.addClass('datepicker-orient-left');
                left -= offset.left - visualPadding;
            } else if (left + calendarWidth > windowWidth) {
                // the calendar passes the widow right edge. Align it to component right side
                this.picker.addClass('datepicker-orient-right');
                left += width - calendarWidth;
            } else {
                // Default to left
                this.picker.addClass('datepicker-orient-left');
            }
        }

        // auto y orientation is best-situation: top or bottom, no fudging,
        // decision based on which shows more of the calendar
        let yorient = this.o.orientation.y;
        let topOverflow;
        if (yorient === 'auto') {
            topOverflow = -scrollTop + top - calendarHeight;
            yorient = topOverflow < 0 ? 'bottom' : 'top';
        }

        this.picker.addClass('datepicker-orient-' + yorient);
        if (yorient === 'top') {
            top -= calendarHeight + parseInt(this.picker.css('padding-top'), 10);
        } else {
            top += height;
        }

        if (this.o.rtl) {
            let right = windowWidth - (left + width);
            this.picker.css({
                top: top,
                right: right,
                zIndex: zIndex,
            });
        } else {
            this.picker.css({
                top: top,
                left: left,
                zIndex: zIndex,
            });
        }
        return this;
    }


    update() {
        if (!this._allow_update) {
            return this;
        }

        let oldDates = this.dates.copy();
        let _dates = [];
        let fromArgs = false;

        if (arguments.length) {
            $.each(arguments, $.proxy(function(i, date) {
                if (date instanceof Date) {
                    date = this._localToUtc(date);
                }
                _dates.push(date);
            }, this));
            fromArgs = true;
        } else {
            _dates = this.isInput ? this.element.val() : this.element.data('date') || this.inputField.val();
            if (_dates && this.o.multidate) {
                _dates = _dates.split(this.o.multidateSeparator);
            } else {
                _dates = [_dates];
            }
            delete this.element.data().date;
        }

        _dates = $.map(_dates, $.proxy(function(date) {
            return DPGlobal.parseDate(date, this.o.format, this.o.language, this.o.assumeNearbyYear);
        }, this));
        _dates = $.grep(_dates, $.proxy(function(date) {
            return (
                !this.dateWithinRange(date) ||
                !date
            );
        }, this), true);
        this.dates.replace(_dates);

        if (this.dates.length) {
            this.viewDate = new Date(this.dates.get(-1));
        } else if (this.viewDate < this.o.startDate) {
            this.viewDate = new Date(this.o.startDate);
        } else if (this.viewDate > this.o.endDate) {
            this.viewDate = new Date(this.o.endDate);
        } else {
            this.viewDate = this.o.defaultViewDate;
        }
        if (fromArgs) {
            // setting date by clicking
            this.setValue();
        } else if (_dates.length) {
            // setting date by typing
            if (String(oldDates) !== String(this.dates)) {
                this._trigger('changeDate');
            }
        }
        if (!this.dates.length && oldDates.length) {
            this._trigger('clearDate');
        }

        this.fill();
        this.element.change();
        return this;
    }


    fillDow() {
        var dowCnt = this.o.weekStart;
        var html = '<tr class="header dow-row">';

        if (this.o.calendarWeeks) {
            this.picker.find('.datepicker-days .datepicker-switch')
                .attr('colspan', function(i, val) {
                    return parseInt(val, 10) + 1;
                });
            html += '<th class="cw">&#160;</th>';
        }
        while (dowCnt < this.o.weekStart + 7) {
            html += '<th class="dow';
            if ($.inArray(dowCnt, this.o.daysOfWeekDisabled) > -1) {
                html += ' disabled';
            }
            html += '">' + dates[this.o.language].daysMin[(dowCnt++)%7] + '</th>';
        }
        html += '</tr>';
        this.picker.find('.datepicker-days thead').append(html);
    }


    fillMonths() {
        var localDate = this._utcToLocal(this.viewDate);
        var html = '';
        var i = 0;
        while (i < 12) {
            let focused = localDate && localDate.getMonth() === i ? ' focused' : '';
            html += '<span class="month' + focused + '">' + dates[this.o.language].monthsShort[i++] + '</span>';
        }
        this.picker.find('.datepicker-months td').html(html);
    }


    setRange(range) {
        if (!range || !range.length) {
            delete this.range;
        } else {
            this.range = $.map(range, function(d) {
                return d.valueOf();
            });
        }
        this.fill();
    }


    getClassNames(date) {
        let cls = [];
        let year = this.viewDate.getUTCFullYear();
        let month = this.viewDate.getUTCMonth();
        let today = new Date();
        if (date.getUTCFullYear() < year || (date.getUTCFullYear() === year && date.getUTCMonth() < month)) {
            cls.push('old');
        } else if (date.getUTCFullYear() > year || (date.getUTCFullYear() === year && date.getUTCMonth() > month)) {
            cls.push('new');
        }

        if (this.focusDate && date.valueOf() === this.focusDate.valueOf()) {
            cls.push('focused');
        }
        // Compare internal UTC date with local today, not UTC today
        if (this.o.todayHighlight &&
            date.getUTCFullYear() === today.getFullYear() &&
            date.getUTCMonth() === today.getMonth() &&
            date.getUTCDate() === today.getDate()) {
            cls.push('today');
        }
        if (this.dates.contains(date) !== -1) {
            cls.push('active');
        }
        if (!this.dateWithinRange(date)) {
            cls.push('disabled');
        }
        if (this.dateIsDisabled(date)) {
            cls.push('disabled', 'disabled-date');
        }
        if ($.inArray(date.getUTCDay(), this.o.daysOfWeekHighlighted) !== -1) {
            cls.push('highlighted');
        }

        if (this.range) {
            if (date > this.range[0] && date < this.range[this.range.length - 1]) {
                cls.push('range');
            }
            if ($.inArray(date.valueOf(), this.range) !== -1) {
                cls.push('selected');
            }
            if (date.valueOf() === this.range[0]) {
                cls.push('range-start');
            }
            if (date.valueOf() === this.range[this.range.length - 1]) {
                cls.push('range-end');
            }
        }
        return cls;
    }


    _fillYearsView(selector, cssClass, factor, step, currentYear, startYear, endYear, callback) {
        var html, view, year, steps, startStep, endStep, thisYear, i, classes, tooltip, before;

        html      = '';
        view      = this.picker.find(selector);
        year      = parseInt(currentYear / factor, 10) * factor;
        startStep = parseInt(startYear / step, 10) * step;
        endStep   = parseInt(endYear / step, 10) * step;
        steps     = $.map(this.dates, function(d) {
            return parseInt(d.getUTCFullYear() / step, 10) * step;
        });

        view.find('.datepicker-switch').text(year + '-' + (year + step * 9));

        thisYear = year - step;
        for (i = -1; i < 11; i += 1) {
            classes = [cssClass];
            tooltip = null;

            if (i === -1) {
                classes.push('old');
            } else if (i === 10) {
                classes.push('new');
            }
            if ($.inArray(thisYear, steps) !== -1) {
                classes.push('active');
            }
            if (thisYear < startStep || thisYear > endStep) {
                classes.push('disabled');
            }
            if (thisYear === this.viewDate.getFullYear()) {
                classes.push('focused');
            }

            if (callback !== $.noop) {
                before = callback(new Date(thisYear, 0, 1));
                if (before === undefined) {
                    before = {};
                } else if (typeof(before) === 'boolean') {
                    before = {enabled: before};
                } else if (typeof(before) === 'string') {
                    before = {classes: before};
                }
                if (before.enabled === false) {
                    classes.push('disabled');
                }
                if (before.classes) {
                    classes = classes.concat(before.classes.split(/\s+/));
                }
                if (before.tooltip) {
                    tooltip = before.tooltip;
                }
            }

            html += '<span class="' + classes.join(' ') + '"' + (tooltip ? ' title="' + tooltip + '"' : '') + '>' + thisYear + '</span>';
            thisYear += step;
        }
        view.find('td').html(html);
    }


    fill() {
        let clsName, tooltip, before;
        let d = new Date(this.viewDate);
        let year = d.getUTCFullYear();
        let month = d.getUTCMonth();
        let startYear = this.o.startDate !== -Infinity ? this.o.startDate.getUTCFullYear() : -Infinity;
        let startMonth = this.o.startDate !== -Infinity ? this.o.startDate.getUTCMonth() : -Infinity;
        let endYear = this.o.endDate !== Infinity ? this.o.endDate.getUTCFullYear() : Infinity;
        let endMonth = this.o.endDate !== Infinity ? this.o.endDate.getUTCMonth() : Infinity;
        let todaytxt = dates[this.o.language].today || dates['en'].today || '';
        let cleartxt = dates[this.o.language].clear || dates['en'].clear || '';
        let titleFormat = dates[this.o.language].titleFormat || dates['en'].titleFormat;

        if (isNaN(year) || isNaN(month)) {
            return;
        }
        this.picker.find('.datepicker-days .datepicker-switch').text(DPGlobal.formatDate(d, titleFormat, this.o.language));
        this.picker.find('tfoot .today').text(todaytxt).toggle(this.o.todayBtn !== false);
        this.picker.find('tfoot .clear').text(cleartxt).toggle(this.o.clearBtn !== false);
        this.picker.find('thead .datepicker-title').text(this.o.title).toggle(this.o.title !== '');

        this.updateNavArrows();
        this.fillMonths();
        let prevMonth = UTCDate(year, month - 1, 28);
        let day = DPGlobal.getDaysInMonth(prevMonth.getUTCFullYear(), prevMonth.getUTCMonth());
        prevMonth.setUTCDate(day);
        prevMonth.setUTCDate(day - (prevMonth.getUTCDay() - this.o.weekStart + 7) % 7);
        let nextMonth = new Date(prevMonth);
        if (prevMonth.getUTCFullYear() < 100) {
            nextMonth.setUTCFullYear(prevMonth.getUTCFullYear());
        }
        nextMonth.setUTCDate(nextMonth.getUTCDate() + 42);
        nextMonth = nextMonth.valueOf();
        let html = [];


        while (prevMonth.valueOf() < nextMonth) {
            if (prevMonth.getUTCDay() === this.o.weekStart) {
                html.push('<tr>');
                if (this.o.calendarWeeks) {
                    // ISO 8601: First week contains first thursday.
                    // ISO also states week starts on Monday, but we can be more abstract here.
                    // Start of current week: based on weekstart/current date
                    let ws = new Date(+prevMonth + (this.o.weekStart - prevMonth.getUTCDay() - 7) % 7 * 864e5);
                    // Thursday of this week
                    let th = new Date(Number(ws) + (7 + 4 - ws.getUTCDay()) % 7 * 864e5);
                    // First Thursday of year, year from thursday
                    let yth;
                    yth = new Date(Number(yth = UTCDate(th.getUTCFullYear(), 0, 1)) + (7 + 4 - yth.getUTCDay())%7*864e5);
                    // Calendar week: ms between thursdays, div ms per day, div 7 days
                    let calWeek =  (th - yth) / 864e5 / 7 + 1;
                    html.push('<td class="cw">' + calWeek + '</td>');
                }
            }
            clsName = this.getClassNames(prevMonth);
            clsName.push('day');

            if (this.o.beforeShowDay !== $.noop) {
                before = this.o.beforeShowDay(this._utcToLocal(prevMonth));
                if (before === undefined) {
                    before = {};
                } else if (typeof(before) === 'boolean') {
                    before = {enabled: before};
                } else if (typeof(before) === 'string') {
                    before = {classes: before};
                }
                if (before.enabled === false) {
                    clsName.push('disabled');
                }
                if (before.classes) {
                    clsName = clsName.concat(before.classes.split(/\s+/));
                }
                if (before.tooltip) {
                    tooltip = before.tooltip;
                }
            }

            clsName = $.unique(clsName);

            html.push('<td class="' + clsName.join(' ') + '"' + (tooltip ? ' title="' + tooltip + '"' : '') + (this.o.dateCells ? ' data-date="' + (prevMonth.getTime().toString()) + '"' : '') + '>' + prevMonth.getUTCDate() + '</td>');
            tooltip = null;
            if (prevMonth.getUTCDay() === this.o.weekEnd) {
                html.push('</tr>');
            }
            prevMonth.setUTCDate(prevMonth.getUTCDate() + 1);
        }

        this.picker.find('.datepicker-days tbody').empty().append(html.join(''));
        let monthsTitle = dates[this.o.language].monthsTitle || dates['en'].monthsTitle || 'Months';
        let months = this.picker.find('.datepicker-months')
                                .find('.datepicker-switch').text(this.o.maxViewMode < 2 ? monthsTitle : year).end()
                                .find('tbody span').removeClass('active');

        $.each(this.dates, function(i, _d) {
            if (_d.getUTCFullYear() === year) {
                months.eq(_d.getUTCMonth()).addClass('active');
            }
        });

        if (year < startYear || year > endYear) {
            months.addClass('disabled');
        }
        if (year === startYear) {
            months.slice(0, startMonth).addClass('disabled');
        }
        if (year === endYear) {
            months.slice(endMonth + 1).addClass('disabled');
        }

        if (this.o.beforeShowMonth !== $.noop) {
            $.each(months, (i, _month) => {
                let moDate = new Date(year, i, 1);
                let _before = this.o.beforeShowMonth(moDate);
                if (_before === undefined) {
                    _before = {};
                } else if (typeof(_before) === 'boolean') {
                    _before = {enabled: _before};
                } else if (typeof(_before) === 'string') {
                    _before = {classes: _before};
                }
                if (_before.enabled === false && !$(_month).hasClass('disabled')) {
                    $(_month).addClass('disabled');
                }
                if (_before.classes) {
                    $(_month).addClass(_before.classes);
                }
                if (_before.tooltip) {
                    $(_month).prop('title', _before.tooltip);
                }
            });
        }

        // Generating decade/years picker
        this._fillYearsView('.datepicker-years', 'year', 10, 1, year, startYear, endYear, this.o.beforeShowYear);
        // Generating century/decades picker
        this._fillYearsView('.datepicker-decades', 'decade', 100, 10, year, startYear, endYear, this.o.beforeShowDecade);
        // Generating millennium/centuries picker
        this._fillYearsView('.datepicker-centuries', 'century', 1000, 100, year, startYear, endYear, this.o.beforeShowCentury);
    }


    updateNavArrows() {
        if (!this._allow_update) {
            return;
        }

        let d = new Date(this.viewDate);
        let year = d.getUTCFullYear();
        let month = d.getUTCMonth();
        switch (this.viewMode) {
        case 0:
            if (this.o.startDate !== -Infinity && year <= this.o.startDate.getUTCFullYear() && month <= this.o.startDate.getUTCMonth()) {
                this.picker.find('.prev').addClass('disabled');
            } else {
                this.picker.find('.prev').removeClass('disabled');
            }
            if (this.o.endDate !== Infinity && year >= this.o.endDate.getUTCFullYear() && month >= this.o.endDate.getUTCMonth()) {
                this.picker.find('.next').addClass('disabled');
            } else {
                this.picker.find('.next').removeClass('disabled');
            }
            break;
        case 1:
        case 2:
        case 3:
        case 4:
            if (this.o.startDate !== -Infinity && year <= this.o.startDate.getUTCFullYear() || this.o.maxViewMode < 2) {
                this.picker.find('.prev').addClass('disabled');
            } else {
                this.picker.find('.prev').removeClass('disabled');
            }
            if (this.o.endDate !== Infinity && year >= this.o.endDate.getUTCFullYear() || this.o.maxViewMode < 2) {
                this.picker.find('.next').addClass('disabled');
            } else {
                this.picker.find('.next').removeClass('disabled');
            }
            break;
        }
    }


    getDateOfWeek(weekNumber, year) {
        //Create a date object starting january first of chosen year, plus the number of days in a week multiplied by the week number to get the right date.
        return new Date(year, 0, 1 + ((weekNumber - 1) * 7));
    }


    /**
     * Source: http://stackoverflow.com/questions/7580824/how-to-convert-a-week-number-to-a-date-in-javascript
     */
    firstDayOfWeek(week, year) {
        // Jan 1 of 'year'
        let d = new Date(year, 0, 1);
        let offset = d.getTimezoneOffset();

        // ISO: week 1 is the one with the year's first Thursday
        // so nearest Thursday: current date + 4 - current day number
        // Sunday is converted from 0 to 7
        d.setDate(d.getDate() + 4 - (d.getDay() || 7));
        // 7 days * (week - overlapping first week)
        d.setTime(d.getTime() + 7 * 24 * 60 * 60 * 1000 * (week + (year === d.getFullYear() ? -1 : 0 )));
        // daylight savings fix
        d.setTime(d.getTime() + (d.getTimezoneOffset() - offset) * 60 * 1000);
        // back to Monday (from Thursday)
        d.setDate(d.getDate() - 3);
        return d;
    }


    /**
     * General Datepicker click handler.
     */
    click(e) {
        let dir, day, year, month, monthChanged, yearChanged;
        e.preventDefault();
        let target = $(e.target);

        // In week-mode, we skip the rest of the click handler when clicking on
        // a day or week number.
        if ($(e.currentTarget).hasClass('week-select')) {
            // A week number was clicked directly.
            if (target.hasClass('cw') || target.hasClass('day')) {
                let weekNumber, weekSelector;
                target.hasClass('cw') ? weekSelector = target : weekSelector  = target.siblings().first();
                weekNumber = parseInt(weekSelector.text(), 10);
                this.viewDate = this.firstDayOfWeek(weekNumber, new Date().getFullYear());
                // Sometimes this.dates is not set yet. Force it here.
                if (!this.dates.length) {
                    this.dates.push(this.viewDate);
                }
                return;
            }
        }

        // From here, no more events are picked up by datepicker.
        e.stopPropagation();

        // Clicked on the switch
        if (target.hasClass('datepicker-switch')) {
            this.showMode(1);
        }

        // Clicked on prev or next
        let navArrow = target.closest('.prev, .next');
        if (navArrow.length > 0) {
            dir = DPGlobal.modes[this.viewMode].navStep * (navArrow.hasClass('prev') ? -1 : 1);
            if (this.viewMode === 0) {
                this.viewDate = this.moveMonth(this.viewDate, dir);
                this._trigger('changeMonth', this.viewDate);
            } else {
                this.viewDate = this.moveYear(this.viewDate, dir);
                if (this.viewMode === 1) {
                    this._trigger('changeYear', this.viewDate);
                }
            }
            this.fill();
        }

        // Clicked on today button
        if (target.hasClass('today') && !target.hasClass('day')) {
            this.showMode(-2);
            this._setDate(UTCToday(), this.o.todayBtn === 'linked' ? null : 'view');
        }

        // Clicked on clear button
        if (target.hasClass('clear')) {
            this.clearDates();
        }

        if (!target.hasClass('disabled')) {
            // Clicked on a day
            if (target.hasClass('day')) {
                day = parseInt(target.text(), 10) || 1;
                year = this.viewDate.getUTCFullYear();
                month = this.viewDate.getUTCMonth();

                // From last month
                if (target.hasClass('old')) {
                    if (month === 0) {
                        month = 11;
                        year = year - 1;
                        monthChanged = true;
                        yearChanged = true;
                    } else {
                        month = month - 1;
                        monthChanged = true;
                    }
                }

                // From next month
                if (target.hasClass('new')) {
                    if (month === 11) {
                        month = 0;
                        year = year + 1;
                        monthChanged = true;
                        yearChanged = true;
                    } else {
                        month = month + 1;
                        monthChanged = true;
                    }
                }
                this._setDate(UTCDate(year, month, day));
                if (yearChanged) {
                    this._trigger('changeYear', this.viewDate);
                }
                if (monthChanged) {
                    this._trigger('changeMonth', this.viewDate);
                }
            }

            // Clicked on a month
            if (target.hasClass('month')) {
                this.viewDate.setUTCDate(1);
                day = 1;
                month = target.parent().find('span').index(target);
                year = this.viewDate.getUTCFullYear();
                this.viewDate.setUTCMonth(month);
                this._trigger('changeMonth', this.viewDate);
                if (this.o.minViewMode === 1) {
                    this._setDate(UTCDate(year, month, day));
                    this.showMode();
                } else {
                    this.showMode(-1);
                }
                this.fill();
            }

            // Clicked on a year
            if (target.hasClass('year') || target.hasClass('decade') || target.hasClass('century')) {
                this.viewDate.setUTCDate(1);

                day = 1;
                month = 0;
                year = parseInt(target.text(), 10) || 0;
                this.viewDate.setUTCFullYear(year);

                if (target.hasClass('year')) {
                    this._trigger('changeYear', this.viewDate);
                    if (this.o.minViewMode === 2) {
                        this._setDate(UTCDate(year, month, day));
                    }
                }
                if (target.hasClass('decade')) {
                    this._trigger('changeDecade', this.viewDate);
                    if (this.o.minViewMode === 3) {
                        this._setDate(UTCDate(year, month, day));
                    }
                }
                if (target.hasClass('century')) {
                    this._trigger('changeCentury', this.viewDate);
                    if (this.o.minViewMode === 4) {
                        this._setDate(UTCDate(year, month, day));
                    }
                }

                this.showMode(-1);
                this.fill();
            }
        }

        if (this.picker.is(':visible') && this._focused_from) {
            $(this._focused_from).focus();
        }
        delete this._focused_from;
    }


    _toggleMultidate(date) {
        var ix = this.dates.contains(date);
        if (!date) {
            this.dates.clear();
        }

        if (ix !== -1) {
            if (this.o.multidate === true || this.o.multidate > 1 || this.o.toggleActive) {
                this.dates.remove(ix);
            }
        } else if (this.o.multidate === false) {
            this.dates.clear();
            this.dates.push(date);
        } else {
            this.dates.push(date);
        }

        if (typeof this.o.multidate === 'number') {
            while (this.dates.length > this.o.multidate) {
                this.dates.remove(0);
            }
        }
    }


    _setDate(date, which) {
        if (!which || which === 'date') {
            this._toggleMultidate(date && new Date(date));
        }
        if (!which || which === 'view') {
            this.viewDate = date && new Date(date);
        }

        this.fill();
        this.setValue();
        if (!which || which !== 'view') {
            this._trigger('changeDate');
        }
        if (this.inputField) {
            this.inputField.change();
        }
        if (this.o.autoclose && (!which || which === 'date')) {
            this.hide();
        }
    }


    moveDay(date, dir) {
        var newDate = new Date(date);
        newDate.setUTCDate(date.getUTCDate() + dir);

        return newDate;
    }


    moveWeek(date, dir) {
        return this.moveDay(date, dir * 7);
    }


    moveMonth(date, dir) {
        if (!isValidDate(date)) {
            return this.o.defaultViewDate;
        }
        if (!dir) {
            return date;
        }
        let newDate = new Date(date.valueOf());
        let day = newDate.getUTCDate();
        let month = newDate.getUTCMonth();
        let mag = Math.abs(dir);
        let newMonth, test;

        dir = dir > 0 ? 1 : -1;
        if (mag === 1) {
            test = dir === -1
                // If going back one month, make sure month is not current month
                // (eg, Mar 31 -> Feb 31 == Feb 28, not Mar 02)
                ? function() {
                    return newDate.getUTCMonth() === month;
                }
                // If going forward one month, make sure month is as expected
                // (eg, Jan 31 -> Feb 31 == Feb 28, not Mar 02)
                : function() {
                    return newDate.getUTCMonth() !== newMonth;
                };
            newMonth = month + dir;
            newDate.setUTCMonth(newMonth);
            // Dec -> Jan (12) or Jan -> Dec (-1) -- limit expected date to 0-11
            if (newMonth < 0 || newMonth > 11) {
                newMonth = (newMonth + 12) % 12;
            }
        } else {
            // For magnitudes >1, move one month at a time...
            for (let i = 0; i < mag; i++) {
                // ...which might decrease the day (eg, Jan 31 to Feb 28, etc)...
                newDate = this.moveMonth(newDate, dir);
            }
            // ...then reset the day, keeping it in the new month
            newMonth = newDate.getUTCMonth();
            newDate.setUTCDate(day);
            test = function() {
                return newMonth !== newDate.getUTCMonth();
            };
        }
        // Common date-resetting loop -- if date is beyond end of month, make it
        // end of month
        while (test()) {
            newDate.setUTCDate(--day);
            newDate.setUTCMonth(newMonth);
        }
        return newDate;
    }


    moveYear(date, dir) {
        return this.moveMonth(date, dir * 12);
    }


    moveAvailableDate(date, dir, fn) {
        do {
            date = this[fn](date, dir);
            if (!this.dateWithinRange(date)) {
                return false;
            }

            fn = 'moveDay';
        }
        while (this.dateIsDisabled(date));

        return date;
    }


    weekOfDateIsDisabled(date) {
        return $.inArray(date.getUTCDay(), this.o.daysOfWeekDisabled) !== -1;
    }


    dateIsDisabled(date) {
        return (
            this.weekOfDateIsDisabled(date) ||
            $.grep(this.o.datesDisabled, function(d) {
                return isUTCEquals(date, d);
            }).length > 0
        );
    }


    dateWithinRange(date) {
        return date >= this.o.startDate && date <= this.o.endDate;
    }


    keydown(e) {
        if (!this.picker.is(':visible')) {
            if (e.keyCode === 40 || e.keyCode === 27) { // allow down to re-show picker
                this.show();
                e.stopPropagation();
            }
            return;
        }
        let dateChanged = false;
        let dir, newViewDate;
        let focusDate = this.focusDate || this.viewDate;
        switch (e.keyCode) {
        case 27: // escape
            if (this.focusDate) {
                this.focusDate = null;
                this.viewDate = this.dates.get(-1) || this.viewDate;
                this.fill();
            }
            else
                this.hide();
            e.preventDefault();
            e.stopPropagation();
            break;
        case 37: // left
        case 38: // up
        case 39: // right
        case 40: // down
            if (!this.o.keyboardNavigation || this.o.daysOfWeekDisabled.length === 7) {
                break;
            }
            dir = e.keyCode === 37 || e.keyCode === 38 ? -1 : 1;
            if (this.viewMode === 0) {
                if (e.ctrlKey) {
                    newViewDate = this.moveAvailableDate(focusDate, dir, 'moveYear');
                    if (newViewDate) {
                        this._trigger('changeYear', this.viewDate);
                    }
                } else if (e.shiftKey) {
                    newViewDate = this.moveAvailableDate(focusDate, dir, 'moveMonth');
                    if (newViewDate) {
                        this._trigger('changeMonth', this.viewDate);
                    }
                } else if (e.keyCode === 37 || e.keyCode === 39) {
                    newViewDate = this.moveAvailableDate(focusDate, dir, 'moveDay');
                } else if (!this.weekOfDateIsDisabled(focusDate)) {
                    newViewDate = this.moveAvailableDate(focusDate, dir, 'moveWeek');
                }
            } else if (this.viewMode === 1) {
                if (e.keyCode === 38 || e.keyCode === 40) {
                    dir = dir * 4;
                }
                newViewDate = this.moveAvailableDate(focusDate, dir, 'moveMonth');
            } else if (this.viewMode === 2) {
                if (e.keyCode === 38 || e.keyCode === 40) {
                    dir = dir * 4;
                }
                newViewDate = this.moveAvailableDate(focusDate, dir, 'moveYear');
            }

            if (newViewDate) {
                this.focusDate = this.viewDate = newViewDate;
                this.setValue();
                this.fill();
                e.preventDefault();
            }
            break;
        case 13: // enter
            if (!this.o.forceParse) {
                break;
            }
            focusDate = this.focusDate || this.dates.get(-1) || this.viewDate;
            if (this.o.keyboardNavigation) {
                this._toggleMultidate(focusDate);
                dateChanged = true;
            }
            this.focusDate = null;
            this.viewDate = this.dates.get(-1) || this.viewDate;
            this.setValue();
            this.fill();
            if (this.picker.is(':visible')) {
                e.preventDefault();
                e.stopPropagation();
                if (this.o.autoclose) {
                    this.hide();
                }
            }
            break;
        case 9: // tab
            this.focusDate = null;
            this.viewDate = this.dates.get(-1) || this.viewDate;
            this.fill();
            this.hide();
            break;
        }
        if (dateChanged) {
            if (this.dates.length) {
                this._trigger('changeDate');
            } else {
                this._trigger('clearDate');
            }
            if (this.inputField) {
                this.inputField.change();
            }
        }
    }


    showMode(dir) {
        if (dir) {
            this.viewMode = Math.max(this.o.minViewMode, Math.min(this.o.maxViewMode, this.viewMode + dir));
        }
        this.picker
            .children('div')
            .hide()
            .filter('.datepicker-' + DPGlobal.modes[this.viewMode].clsName)
                .show();
        this.updateNavArrows();
    }
}

Datepicker._events = [];
Datepicker._secondaryEvents = [];
Datepicker._allow_update = true;
Datepicker.setDate = alias('setDates');
Datepicker.setUTCDate = alias('setUTCDates');
Datepicker.remove = alias('destroy');


class DateRangePicker {

    constructor(element, options) {
        $(element).data('datepicker', this);
        this.element = $(element);
        this.inputs = $.map(options.inputs, function(i) {return i.jquery ? i[0] : i;});
        delete options.inputs;

        this.keepEmptyValues = options.keepEmptyValues;
        delete options.keepEmptyValues;

        datepickerPlugin.call($(this.inputs), options).on('changeDate', $.proxy(this.dateUpdated, this));
        this.pickers = $.map(this.inputs, function(i) {
            return $(i).data('datepicker');
        });
        this.updateDates();
    }

    updateDates() {
        this.dates = $.map(this.pickers, function(i) {
            return i.getUTCDate();
        });
        this.updateRanges();
    }


    updateRanges() {
        var range = $.map(this.dates, function(d) {
            return d.valueOf();
        });
        $.each(this.pickers, function(i, p) {
            p.setRange(range);
        });
    }


    dateUpdated(e) {
        // `this.updating` is a workaround for preventing infinite recursion
        // between `changeDate` triggering and `setUTCDate` calling.  Until
        // there is a better mechanism.
        if (this.updating) {
            return;
        }
        this.updating = true;

        let dp = $(e.target).data('datepicker');

        if (typeof(dp) === 'undefined') {
            return;
        }

        let newDate = dp.getUTCDate();
        let keepEmptyValues = this.keepEmptyValues;
        let i = $.inArray(e.target, this.inputs);
        let j = i - 1;
        let k = i + 1;
        let l = this.inputs.length;
        if (i === -1) {
            return;
        }

        $.each(this.pickers, function(_i, p) {
            if (!p.getUTCDate() && (p === dp || !keepEmptyValues)) {
                p.setUTCDate(newDate);
            }
        });

        if (newDate < this.dates[j]) {
            // Date being moved earlier/left
            while (j >= 0 && newDate < this.dates[j]) {
                this.pickers[j--].setUTCDate(newDate);
            }
        } else if (newDate > this.dates[k]) {
            // Date being moved later/right
            while (k < l && newDate > this.dates[k]) {
                this.pickers[k++].setUTCDate(newDate);
            }
        }
        this.updateDates();

        delete this.updating;
    }


    remove() {
        $.map(this.pickers, function(p) { p.remove(); });
        delete this.element.data().datepicker;
    }
}


function optsFromEl(el, prefix) {
    // Derive options from element data-attrs
    let inkey;
    let data = $(el).data();
    let out = {};
    let replace = new RegExp('^' + prefix.toLowerCase() + '([A-Z])');
    prefix = new RegExp('^' + prefix.toLowerCase());
    function reLower(_, a) {
        return a.toLowerCase();
    }
    for (let key in data) {
        if (prefix.test(key)) {
            inkey = key.replace(replace, reLower);
            out[inkey] = data[key];
        }
    }
    return out;
}


function optsFromLocale(lang) {
    // Derive options from locale plugins
    var out = {};
    // Check if "de-DE" style date is available, if not language should
    // fallback to 2 letter code eg "de"
    if (!dates[lang]) {
        lang = lang.split('-')[0];
        if (!dates[lang]) {
            return;
        }
    }
    let d = dates[lang];
    $.each(localeOpts, function(i, k) {
        if (k in d) {
            out[k] = d[k];
        }
    });
    return out;
}


let datepickerPlugin = function(option) {
    var args = Array.apply(null, arguments);
    args.shift();
    let internalReturn;
    this.each(function() {
        let $this = $(this);
        let data = $this.data('datepicker');
        let options = typeof option === 'object' && option;
        if (!data) {
            let elopts = optsFromEl(this, 'date');
                // Preliminary otions
            let xopts = $.extend({}, defaults, elopts, options);
            let locopts = optsFromLocale(xopts.language);
            // Options priority: js args, data-attrs, locales, default.
            let opts = $.extend({}, defaults, locopts, elopts, options);
            if ($this.hasClass('input-daterange') || opts.inputs) {
                $.extend(opts, {
                    inputs: opts.inputs || $this.find('input').toArray(),
                });
                data = new DateRangePicker(this, opts);
            } else {
                data = new Datepicker(this, opts);
            }
            $this.data('datepicker', data);
        }
        if (typeof option === 'string' && typeof data[option] === 'function') {
            internalReturn = data[option].apply(data, args);
        }
    });

    if (internalReturn === undefined || internalReturn instanceof Datepicker || internalReturn instanceof DateRangePicker) {
        return this;
    }

    if (this.length > 1) {
        throw new Error('Using only allowed for the collection of a single element (' + option + ' function)');
    } else {
        return internalReturn;
    }
};


$.fn.datepicker = datepickerPlugin;
$.fn.datepicker.defaults = defaults;
$.fn.datepicker.localeOpts = localeOpts;
$.fn.datepicker.dates = dates;


DPGlobal = {
    modes: [
        {
            clsName: 'days',
            navFnc: 'Month',
            navStep: 1,
        },
        {
            clsName: 'months',
            navFnc: 'FullYear',
            navStep: 1,
        },
        {
            clsName: 'years',
            navFnc: 'FullYear',
            navStep: 10,
        },
        {
            clsName: 'decades',
            navFnc: 'FullDecade',
            navStep: 100,
        },
        {
            clsName: 'centuries',
            navFnc: 'FullCentury',
            navStep: 1000,
        },
    ],
    isLeapYear: function(year) {
        return (((year % 4 === 0) && (year % 100 !== 0)) || (year % 400 === 0));
    },


    getDaysInMonth: function(year, month) {
        return [31, (DPGlobal.isLeapYear(year) ? 29 : 28), 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month];
    },

    validParts: /dd?|DD?|mm?|MM?|yy(?:yy)?/g,


    nonpunctuation: /[^ -\/:-@\u5e74\u6708\u65e5\[-`{-~\t\n\r]+/g,


    parseFormat: function(format) {
        if (typeof format.toValue === 'function' && typeof format.toDisplay === 'function') {
            return format;
        }
        // IE treats \0 as a string end in inputs (truncating the value),
        // so it's a bad format delimiter, anyway
        let separators = format.replace(this.validParts, '\0').split('\0');
        let parts = format.match(this.validParts);
        if (!separators || !separators.length || !parts || parts.length === 0) {
            throw new Error('Invalid date format.');
        }
        return {separators: separators, parts: parts};
    },


    parseDate: function(date, format, language, assumeNearby) {
        let val, filtered, part, dir, i, fn;
        if (!date) {
            return undefined;
        }
        if (date instanceof Date) {
            return date;
        }
        if (typeof format === 'string') {
            format = DPGlobal.parseFormat(format);
        }
        if (format.toValue) {
            return format.toValue(date, format, language);
        }
        let partRe = /([\-+]\d+)([dmwy])/;
        let parts = date.match(/([\-+]\d+)([dmwy])/g);
        let fnMap = {
            d: 'moveDay',
            m: 'moveMonth',
            w: 'moveWeek',
            y: 'moveYear',
        };
        let dateAliases = {
            yesterday: '-1d',
            today: '+0d',
            tomorrow: '+1d',
        };

        if (/^[\-+]\d+[dmwy]([\s,]+[\-+]\d+[dmwy])*$/.test(date)) {
            date = new Date();

            for (i = 0; i < parts.length; i++) {
                part = partRe.exec(parts[i]);
                dir = parseInt(part[1], 10);
                fn = fnMap[part[2]];
                date = Datepicker.prototype[fn](date, dir);
            }
            return UTCDate(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
        }

        if (typeof dateAliases[date] !== 'undefined') {
            date = dateAliases[date];
            parts = date.match(/([\-+]\d+)([dmwy])/g);

            if (/^[\-+]\d+[dmwy]([\s,]+[\-+]\d+[dmwy])*$/.test(date)) {
                date = new Date();
                for (i = 0; i < parts.length; i++) {
                    part = partRe.exec(parts[i]);
                    dir = parseInt(part[1], 10);
                    fn = fnMap[part[2]];
                    date = Datepicker.prototype[fn](date, dir);
                }

                return UTCDate(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
            }
        }

        parts = date && date.match(this.nonpunctuation) || [];
        date = new Date();

        function applyNearbyYear(year, threshold) {
            if (threshold === true) {
                threshold = 10;
            }

            // if year is 2 digits or less, than the user most likely is trying to get a recent century
            if (year < 100) {
                year += 2000;
                // if the new year is more than threshold years in advance, use last century
                if (year > ((new Date()).getFullYear() + threshold)) {
                    year -= 100;
                }
            }

            return year;
        }

        let parsed = {};
        let settersOrder = ['yyyy', 'yy', 'M', 'MM', 'm', 'mm', 'd', 'dd'];
        let settersMap = {
            yyyy: function(d, v) {
                return d.setUTCFullYear(assumeNearby ? applyNearbyYear(v, assumeNearby) : v);
            },
            yy: function(d, v) {
                return d.setUTCFullYear(assumeNearby ? applyNearbyYear(v, assumeNearby) : v);
            },
            m: function(d, v) {
                if (isNaN(d)) {
                    return d;
                }
                v -= 1;
                while (v < 0) v += 12;
                v %= 12;
                d.setUTCMonth(v);
                while (d.getUTCMonth() !== v) {
                    d.setUTCDate(d.getUTCDate() - 1);
                }
                return d;
            },
            d: function(d, v) {
                return d.setUTCDate(v);
            },
        };

        settersMap['M'] = settersMap['MM'] = settersMap['mm'] = settersMap['m'];
        settersMap['dd'] = settersMap['d'];
        date = UTCToday();
        let fparts = format.parts.slice();
        // Remove noop parts
        if (parts.length !== fparts.length) {
            fparts = $(fparts).filter(function(i, p) {
                return $.inArray(p, settersOrder) !== -1;
            }).toArray();
        }
        // Process remainder
        function matchPart() {
            var m = this.slice(0, parts[i].length),
                p = parts[i].slice(0, m.length);
            return m.toLowerCase() === p.toLowerCase();
        }
        if (parts.length === fparts.length) {
            let cnt, _date, s;
            for (i=0, cnt = fparts.length; i < cnt; i++) {
                val = parseInt(parts[i], 10);
                part = fparts[i];
                if (isNaN(val)) {
                    switch (part) {
                    case 'MM':
                        filtered = $(dates[language].months).filter(matchPart);
                        val = $.inArray(filtered[0], dates[language].months) + 1;
                        break;
                    case 'M':
                        filtered = $(dates[language].monthsShort).filter(matchPart);
                        val = $.inArray(filtered[0], dates[language].monthsShort) + 1;
                        break;
                    }
                }
                parsed[part] = val;
            }
            for (i = 0; i < settersOrder.length; i++) {
                s = settersOrder[i];
                if (s in parsed && !isNaN(parsed[s])) {
                    _date = new Date(date);
                    settersMap[s](_date, parsed[s]);
                    if (!isNaN(_date)) {
                        date = _date;
                    }
                }
            }
        }
        return date;
    },


    formatDate: function(date, format, language) {
        if (!date) {
            return '';
        }
        if (typeof format === 'string') {
            format = DPGlobal.parseFormat(format);
        }
        if (format.toDisplay) {
            return format.toDisplay(date, format, language);
        }

        let val = {
            d: date.getUTCDate(),
            D: dates[language].daysShort[date.getUTCDay()],
            DD: dates[language].days[date.getUTCDay()],
            m: date.getUTCMonth() + 1,
            M: dates[language].monthsShort[date.getUTCMonth()],
            MM: dates[language].months[date.getUTCMonth()],
            yy: date.getUTCFullYear().toString().substring(2),
            yyyy: date.getUTCFullYear(),
        };
        val.dd = (val.d < 10 ? '0' : '') + val.d;
        val.mm = (val.m < 10 ? '0' : '') + val.m;
        date = [];
        let seps = $.extend([], format.separators);

        for (let i = 0, cnt = format.parts.length; i <= cnt; i++) {
            if (seps.length) {
                date.push(seps.shift());
            }
            date.push(val[format.parts[i]]);
        }
        return date.join('');
    },
    headTemplate: '<thead>' +
                      '<tr>' +
                        '<th colspan="7" class="datepicker-title"></th>' +
                      '</tr>' +
                        '<tr class="header navigation-row">' +
                            '<th class="prev">&laquo;</th>' +
                            '<th colspan="5" class="datepicker-switch"></th>' +
                            '<th class="next">&raquo;</th>' +
                        '</tr>' +
                    '</thead>',
    contTemplate: '<tbody><tr><td colspan="7"></td></tr></tbody>',
    footTemplate: '<tfoot>' +
                        '<tr>' +
                            '<th colspan="7" class="today"></th>' +
                        '</tr>' +
                        '<tr>' +
                            '<th colspan="7" class="clear"></th>' +
                        '</tr>' +
                    '</tfoot>',
};
DPGlobal.template = '<div class="datepicker">' +
                        '<div class="datepicker-days">' +
                            '<table class="table-condensed">' +
                                DPGlobal.headTemplate +
                                '<tbody></tbody>' +
                                DPGlobal.footTemplate +
                            '</table>' +
                        '</div>' +
                        '<div class="datepicker-months">' +
                            '<table class="table-condensed">' +
                                DPGlobal.headTemplate +
                                DPGlobal.contTemplate +
                                DPGlobal.footTemplate +
                            '</table>' +
                        '</div>' +
                        '<div class="datepicker-years">' +
                            '<table class="table-condensed">' +
                                DPGlobal.headTemplate +
                                DPGlobal.contTemplate +
                                DPGlobal.footTemplate +
                            '</table>' +
                        '</div>' +
                        '<div class="datepicker-decades">' +
                            '<table class="table-condensed">' +
                                DPGlobal.headTemplate +
                                DPGlobal.contTemplate +
                                DPGlobal.footTemplate +
                            '</table>' +
                        '</div>' +
                        '<div class="datepicker-centuries">' +
                            '<table class="table-condensed">' +
                                DPGlobal.headTemplate +
                                DPGlobal.contTemplate +
                                DPGlobal.footTemplate +
                            '</table>' +
                        '</div>' +
                    '</div>';

$.fn.datepicker.version = '0.1.0';
$.fn.datepicker.DPGlobal = DPGlobal;


$(document).on('focus.datepicker.data-api click.datepicker.data-api', '[data-provide="datepicker"]', function(e) {
    var $this = $(this);
    if ($this.data('datepicker')) {
        return;
    }

    e.preventDefault();
    // component click requires us to explicitly show it
    datepickerPlugin.call($this, 'show');
});

$(function() {
    datepickerPlugin.call($('[data-provide="datepicker-inline"]'));
});

module.exports = Datepicker;
