
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    const identity = x => x;
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }

    const is_client = typeof window !== 'undefined';
    let now = is_client
        ? () => window.performance.now()
        : () => Date.now();
    let raf = is_client ? cb => requestAnimationFrame(cb) : noop;

    const tasks = new Set();
    function run_tasks(now) {
        tasks.forEach(task => {
            if (!task.c(now)) {
                tasks.delete(task);
                task.f();
            }
        });
        if (tasks.size !== 0)
            raf(run_tasks);
    }
    /**
     * Creates a new task that runs on each raf frame
     * until it returns a falsy value or is aborted
     */
    function loop(callback) {
        let task;
        if (tasks.size === 0)
            raf(run_tasks);
        return {
            promise: new Promise(fulfill => {
                tasks.add(task = { c: callback, f: fulfill });
            }),
            abort() {
                tasks.delete(task);
            }
        };
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function get_root_for_style(node) {
        if (!node)
            return document;
        const root = node.getRootNode ? node.getRootNode() : node.ownerDocument;
        if (root.host) {
            return root;
        }
        return document;
    }
    function append_empty_stylesheet(node) {
        const style_element = element('style');
        append_stylesheet(get_root_for_style(node), style_element);
        return style_element;
    }
    function append_stylesheet(node, style) {
        append(node.head || node, style);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function select_option(select, value) {
        for (let i = 0; i < select.options.length; i += 1) {
            const option = select.options[i];
            if (option.__value === value) {
                option.selected = true;
                return;
            }
        }
    }
    function select_value(select) {
        const selected_option = select.querySelector(':checked') || select.options[0];
        return selected_option && selected_option.__value;
    }
    function custom_event(type, detail, bubbles = false) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, false, detail);
        return e;
    }

    const active_docs = new Set();
    let active = 0;
    // https://github.com/darkskyapp/string-hash/blob/master/index.js
    function hash(str) {
        let hash = 5381;
        let i = str.length;
        while (i--)
            hash = ((hash << 5) - hash) ^ str.charCodeAt(i);
        return hash >>> 0;
    }
    function create_rule(node, a, b, duration, delay, ease, fn, uid = 0) {
        const step = 16.666 / duration;
        let keyframes = '{\n';
        for (let p = 0; p <= 1; p += step) {
            const t = a + (b - a) * ease(p);
            keyframes += p * 100 + `%{${fn(t, 1 - t)}}\n`;
        }
        const rule = keyframes + `100% {${fn(b, 1 - b)}}\n}`;
        const name = `__svelte_${hash(rule)}_${uid}`;
        const doc = get_root_for_style(node);
        active_docs.add(doc);
        const stylesheet = doc.__svelte_stylesheet || (doc.__svelte_stylesheet = append_empty_stylesheet(node).sheet);
        const current_rules = doc.__svelte_rules || (doc.__svelte_rules = {});
        if (!current_rules[name]) {
            current_rules[name] = true;
            stylesheet.insertRule(`@keyframes ${name} ${rule}`, stylesheet.cssRules.length);
        }
        const animation = node.style.animation || '';
        node.style.animation = `${animation ? `${animation}, ` : ''}${name} ${duration}ms linear ${delay}ms 1 both`;
        active += 1;
        return name;
    }
    function delete_rule(node, name) {
        const previous = (node.style.animation || '').split(', ');
        const next = previous.filter(name
            ? anim => anim.indexOf(name) < 0 // remove specific animation
            : anim => anim.indexOf('__svelte') === -1 // remove all Svelte animations
        );
        const deleted = previous.length - next.length;
        if (deleted) {
            node.style.animation = next.join(', ');
            active -= deleted;
            if (!active)
                clear_rules();
        }
    }
    function clear_rules() {
        raf(() => {
            if (active)
                return;
            active_docs.forEach(doc => {
                const stylesheet = doc.__svelte_stylesheet;
                let i = stylesheet.cssRules.length;
                while (i--)
                    stylesheet.deleteRule(i);
                doc.__svelte_rules = {};
            });
            active_docs.clear();
        });
    }

    function create_animation(node, from, fn, params) {
        if (!from)
            return noop;
        const to = node.getBoundingClientRect();
        if (from.left === to.left && from.right === to.right && from.top === to.top && from.bottom === to.bottom)
            return noop;
        const { delay = 0, duration = 300, easing = identity, 
        // @ts-ignore todo: should this be separated from destructuring? Or start/end added to public api and documentation?
        start: start_time = now() + delay, 
        // @ts-ignore todo:
        end = start_time + duration, tick = noop, css } = fn(node, { from, to }, params);
        let running = true;
        let started = false;
        let name;
        function start() {
            if (css) {
                name = create_rule(node, 0, 1, duration, delay, easing, css);
            }
            if (!delay) {
                started = true;
            }
        }
        function stop() {
            if (css)
                delete_rule(node, name);
            running = false;
        }
        loop(now => {
            if (!started && now >= start_time) {
                started = true;
            }
            if (started && now >= end) {
                tick(1, 0);
                stop();
            }
            if (!running) {
                return false;
            }
            if (started) {
                const p = now - start_time;
                const t = 0 + 1 * easing(p / duration);
                tick(t, 1 - t);
            }
            return true;
        });
        start();
        tick(0, 1);
        return stop;
    }
    function fix_position(node) {
        const style = getComputedStyle(node);
        if (style.position !== 'absolute' && style.position !== 'fixed') {
            const { width, height } = style;
            const a = node.getBoundingClientRect();
            node.style.position = 'absolute';
            node.style.width = width;
            node.style.height = height;
            add_transform(node, a);
        }
    }
    function add_transform(node, a) {
        const b = node.getBoundingClientRect();
        if (a.left !== b.left || a.top !== b.top) {
            const style = getComputedStyle(node);
            const transform = style.transform === 'none' ? '' : style.transform;
            node.style.transform = `${transform} translate(${a.left - b.left}px, ${a.top - b.top}px)`;
        }
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);

    function destroy_block(block, lookup) {
        block.d(1);
        lookup.delete(block.key);
    }
    function fix_and_destroy_block(block, lookup) {
        block.f();
        destroy_block(block, lookup);
    }
    function update_keyed_each(old_blocks, dirty, get_key, dynamic, ctx, list, lookup, node, destroy, create_each_block, next, get_context) {
        let o = old_blocks.length;
        let n = list.length;
        let i = o;
        const old_indexes = {};
        while (i--)
            old_indexes[old_blocks[i].key] = i;
        const new_blocks = [];
        const new_lookup = new Map();
        const deltas = new Map();
        i = n;
        while (i--) {
            const child_ctx = get_context(ctx, list, i);
            const key = get_key(child_ctx);
            let block = lookup.get(key);
            if (!block) {
                block = create_each_block(key, child_ctx);
                block.c();
            }
            else if (dynamic) {
                block.p(child_ctx, dirty);
            }
            new_lookup.set(key, new_blocks[i] = block);
            if (key in old_indexes)
                deltas.set(key, Math.abs(i - old_indexes[key]));
        }
        const will_move = new Set();
        const did_move = new Set();
        function insert(block) {
            transition_in(block, 1);
            block.m(node, next);
            lookup.set(block.key, block);
            next = block.first;
            n--;
        }
        while (o && n) {
            const new_block = new_blocks[n - 1];
            const old_block = old_blocks[o - 1];
            const new_key = new_block.key;
            const old_key = old_block.key;
            if (new_block === old_block) {
                // do nothing
                next = new_block.first;
                o--;
                n--;
            }
            else if (!new_lookup.has(old_key)) {
                // remove old block
                destroy(old_block, lookup);
                o--;
            }
            else if (!lookup.has(new_key) || will_move.has(new_key)) {
                insert(new_block);
            }
            else if (did_move.has(old_key)) {
                o--;
            }
            else if (deltas.get(new_key) > deltas.get(old_key)) {
                did_move.add(new_key);
                insert(new_block);
            }
            else {
                will_move.add(old_key);
                o--;
            }
        }
        while (o--) {
            const old_block = old_blocks[o];
            if (!new_lookup.has(old_block.key))
                destroy(old_block, lookup);
        }
        while (n)
            insert(new_blocks[n - 1]);
        return new_blocks;
    }
    function validate_each_keys(ctx, list, get_context, get_key) {
        const keys = new Set();
        for (let i = 0; i < list.length; i++) {
            const key = get_key(get_context(ctx, list, i));
            if (keys.has(key)) {
                throw new Error('Cannot have duplicate keys in a keyed each');
            }
            keys.add(key);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : options.context || []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.41.0' }, detail), true));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function prop_dev(node, property, value) {
        node[property] = value;
        dispatch_dev('SvelteDOMSetProperty', { node, property, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    function cubicOut(t) {
        const f = t - 1.0;
        return f * f * f + 1.0;
    }

    function flip(node, animation, params = {}) {
        const style = getComputedStyle(node);
        const transform = style.transform === 'none' ? '' : style.transform;
        const scaleX = animation.from.width / node.clientWidth;
        const scaleY = animation.from.height / node.clientHeight;
        const dx = (animation.from.left - animation.to.left) / scaleX;
        const dy = (animation.from.top - animation.to.top) / scaleY;
        const d = Math.sqrt(dx * dx + dy * dy);
        const { delay = 0, duration = (d) => Math.sqrt(d) * 120, easing = cubicOut } = params;
        return {
            delay,
            duration: is_function(duration) ? duration(d) : duration,
            easing,
            css: (_t, u) => `transform: ${transform} translate(${u * dx}px, ${u * dy}px);`
        };
    }

    /* src/Table.svelte generated by Svelte v3.41.0 */
    const file$3 = "src/Table.svelte";

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[1] = list[i];
    	child_ctx[3] = i;
    	return child_ctx;
    }

    // (27:4) {#each questionData as question, index(question) }
    function create_each_block$1(key_1, ctx) {
    	let tr;
    	let td0;
    	let t0_value = /*question*/ ctx[1].exam + "";
    	let t0;
    	let t1;
    	let td1;
    	let t2_value = /*question*/ ctx[1].year + "";
    	let t2;
    	let t3;
    	let td2;
    	let t4_value = /*question*/ ctx[1].subject + "";
    	let t4;
    	let t5;
    	let td3;
    	let t6_value = /*question*/ ctx[1].section + "";
    	let t6;
    	let t7;
    	let td4;
    	let t8_value = /*question*/ ctx[1].question + "";
    	let t8;
    	let t9;
    	let td5;
    	let t10_value = /*question*/ ctx[1].answer + "";
    	let t10;
    	let t11;
    	let td6;
    	let t12_value = /*question*/ ctx[1].option1 + "";
    	let t12;
    	let t13;
    	let td7;
    	let t14_value = /*question*/ ctx[1].option2 + "";
    	let t14;
    	let t15;
    	let td8;
    	let t16_value = /*question*/ ctx[1].option3 + "";
    	let t16;
    	let t17;
    	let td9;
    	let t18_value = /*question*/ ctx[1].solution + "";
    	let t18;
    	let t19;
    	let td10;
    	let t20_value = /*question*/ ctx[1].image + "";
    	let t20;
    	let t21;
    	let rect;
    	let stop_animation = noop;

    	const block = {
    		key: key_1,
    		first: null,
    		c: function create() {
    			tr = element("tr");
    			td0 = element("td");
    			t0 = text(t0_value);
    			t1 = space();
    			td1 = element("td");
    			t2 = text(t2_value);
    			t3 = space();
    			td2 = element("td");
    			t4 = text(t4_value);
    			t5 = space();
    			td3 = element("td");
    			t6 = text(t6_value);
    			t7 = space();
    			td4 = element("td");
    			t8 = text(t8_value);
    			t9 = space();
    			td5 = element("td");
    			t10 = text(t10_value);
    			t11 = space();
    			td6 = element("td");
    			t12 = text(t12_value);
    			t13 = space();
    			td7 = element("td");
    			t14 = text(t14_value);
    			t15 = space();
    			td8 = element("td");
    			t16 = text(t16_value);
    			t17 = space();
    			td9 = element("td");
    			t18 = text(t18_value);
    			t19 = space();
    			td10 = element("td");
    			t20 = text(t20_value);
    			t21 = space();
    			add_location(td0, file$3, 28, 8, 683);
    			add_location(td1, file$3, 29, 8, 716);
    			add_location(td2, file$3, 30, 8, 749);
    			add_location(td3, file$3, 31, 8, 785);
    			add_location(td4, file$3, 32, 8, 821);
    			add_location(td5, file$3, 33, 8, 858);
    			add_location(td6, file$3, 34, 8, 893);
    			add_location(td7, file$3, 35, 8, 929);
    			add_location(td8, file$3, 36, 8, 965);
    			add_location(td9, file$3, 37, 8, 1001);
    			add_location(td10, file$3, 38, 8, 1038);
    			add_location(tr, file$3, 27, 8, 649);
    			this.first = tr;
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, tr, anchor);
    			append_dev(tr, td0);
    			append_dev(td0, t0);
    			append_dev(tr, t1);
    			append_dev(tr, td1);
    			append_dev(td1, t2);
    			append_dev(tr, t3);
    			append_dev(tr, td2);
    			append_dev(td2, t4);
    			append_dev(tr, t5);
    			append_dev(tr, td3);
    			append_dev(td3, t6);
    			append_dev(tr, t7);
    			append_dev(tr, td4);
    			append_dev(td4, t8);
    			append_dev(tr, t9);
    			append_dev(tr, td5);
    			append_dev(td5, t10);
    			append_dev(tr, t11);
    			append_dev(tr, td6);
    			append_dev(td6, t12);
    			append_dev(tr, t13);
    			append_dev(tr, td7);
    			append_dev(td7, t14);
    			append_dev(tr, t15);
    			append_dev(tr, td8);
    			append_dev(td8, t16);
    			append_dev(tr, t17);
    			append_dev(tr, td9);
    			append_dev(td9, t18);
    			append_dev(tr, t19);
    			append_dev(tr, td10);
    			append_dev(td10, t20);
    			append_dev(tr, t21);
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty & /*questionData*/ 1 && t0_value !== (t0_value = /*question*/ ctx[1].exam + "")) set_data_dev(t0, t0_value);
    			if (dirty & /*questionData*/ 1 && t2_value !== (t2_value = /*question*/ ctx[1].year + "")) set_data_dev(t2, t2_value);
    			if (dirty & /*questionData*/ 1 && t4_value !== (t4_value = /*question*/ ctx[1].subject + "")) set_data_dev(t4, t4_value);
    			if (dirty & /*questionData*/ 1 && t6_value !== (t6_value = /*question*/ ctx[1].section + "")) set_data_dev(t6, t6_value);
    			if (dirty & /*questionData*/ 1 && t8_value !== (t8_value = /*question*/ ctx[1].question + "")) set_data_dev(t8, t8_value);
    			if (dirty & /*questionData*/ 1 && t10_value !== (t10_value = /*question*/ ctx[1].answer + "")) set_data_dev(t10, t10_value);
    			if (dirty & /*questionData*/ 1 && t12_value !== (t12_value = /*question*/ ctx[1].option1 + "")) set_data_dev(t12, t12_value);
    			if (dirty & /*questionData*/ 1 && t14_value !== (t14_value = /*question*/ ctx[1].option2 + "")) set_data_dev(t14, t14_value);
    			if (dirty & /*questionData*/ 1 && t16_value !== (t16_value = /*question*/ ctx[1].option3 + "")) set_data_dev(t16, t16_value);
    			if (dirty & /*questionData*/ 1 && t18_value !== (t18_value = /*question*/ ctx[1].solution + "")) set_data_dev(t18, t18_value);
    			if (dirty & /*questionData*/ 1 && t20_value !== (t20_value = /*question*/ ctx[1].image + "")) set_data_dev(t20, t20_value);
    		},
    		r: function measure() {
    			rect = tr.getBoundingClientRect();
    		},
    		f: function fix() {
    			fix_position(tr);
    			stop_animation();
    		},
    		a: function animate() {
    			stop_animation();
    			stop_animation = create_animation(tr, rect, flip, {});
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(tr);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$1.name,
    		type: "each",
    		source: "(27:4) {#each questionData as question, index(question) }",
    		ctx
    	});

    	return block;
    }

    function create_fragment$3(ctx) {
    	let div;
    	let table;
    	let thead;
    	let tr;
    	let th0;
    	let t1;
    	let th1;
    	let t3;
    	let th2;
    	let t5;
    	let th3;
    	let t7;
    	let th4;
    	let t9;
    	let th5;
    	let t11;
    	let th6;
    	let t13;
    	let th7;
    	let t15;
    	let th8;
    	let t17;
    	let th9;
    	let t19;
    	let th10;
    	let t21;
    	let tbody;
    	let each_blocks = [];
    	let each_1_lookup = new Map();
    	let each_value = /*questionData*/ ctx[0];
    	validate_each_argument(each_value);
    	const get_key = ctx => /*question*/ ctx[1];
    	validate_each_keys(ctx, each_value, get_each_context$1, get_key);

    	for (let i = 0; i < each_value.length; i += 1) {
    		let child_ctx = get_each_context$1(ctx, each_value, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block$1(key, child_ctx));
    	}

    	const block = {
    		c: function create() {
    			div = element("div");
    			table = element("table");
    			thead = element("thead");
    			tr = element("tr");
    			th0 = element("th");
    			th0.textContent = "Exam";
    			t1 = space();
    			th1 = element("th");
    			th1.textContent = "Year";
    			t3 = space();
    			th2 = element("th");
    			th2.textContent = "Subject";
    			t5 = space();
    			th3 = element("th");
    			th3.textContent = "Section";
    			t7 = space();
    			th4 = element("th");
    			th4.textContent = "Question";
    			t9 = space();
    			th5 = element("th");
    			th5.textContent = "Answer";
    			t11 = space();
    			th6 = element("th");
    			th6.textContent = "Option1";
    			t13 = space();
    			th7 = element("th");
    			th7.textContent = "Option2";
    			t15 = space();
    			th8 = element("th");
    			th8.textContent = "Option3";
    			t17 = space();
    			th9 = element("th");
    			th9.textContent = "Solution";
    			t19 = space();
    			th10 = element("th");
    			th10.textContent = "Image";
    			t21 = space();
    			tbody = element("tbody");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(th0, "scope", "col");
    			attr_dev(th0, "class", "svelte-95p25k");
    			add_location(th0, file$3, 12, 6, 183);
    			attr_dev(th1, "scope", "col");
    			attr_dev(th1, "class", "svelte-95p25k");
    			add_location(th1, file$3, 13, 6, 215);
    			attr_dev(th2, "scope", "col");
    			attr_dev(th2, "class", "svelte-95p25k");
    			add_location(th2, file$3, 14, 6, 247);
    			attr_dev(th3, "scope", "col");
    			attr_dev(th3, "class", "svelte-95p25k");
    			add_location(th3, file$3, 15, 6, 282);
    			attr_dev(th4, "scope", "col");
    			attr_dev(th4, "class", "svelte-95p25k");
    			add_location(th4, file$3, 16, 6, 317);
    			attr_dev(th5, "scope", "col");
    			attr_dev(th5, "class", "svelte-95p25k");
    			add_location(th5, file$3, 17, 6, 353);
    			attr_dev(th6, "scope", "col");
    			attr_dev(th6, "class", "svelte-95p25k");
    			add_location(th6, file$3, 18, 6, 387);
    			attr_dev(th7, "scope", "col");
    			attr_dev(th7, "class", "svelte-95p25k");
    			add_location(th7, file$3, 19, 6, 422);
    			attr_dev(th8, "scope", "col");
    			attr_dev(th8, "class", "svelte-95p25k");
    			add_location(th8, file$3, 20, 6, 457);
    			attr_dev(th9, "scope", "col");
    			attr_dev(th9, "class", "svelte-95p25k");
    			add_location(th9, file$3, 21, 6, 492);
    			attr_dev(th10, "scope", "col");
    			attr_dev(th10, "class", "svelte-95p25k");
    			add_location(th10, file$3, 22, 6, 528);
    			add_location(tr, file$3, 10, 4, 165);
    			add_location(thead, file$3, 9, 2, 153);
    			add_location(tbody, file$3, 25, 2, 578);
    			attr_dev(table, "class", "table table-hover svelte-95p25k");
    			add_location(table, file$3, 8, 4, 117);
    			attr_dev(div, "class", "table-section svelte-95p25k");
    			add_location(div, file$3, 7, 0, 85);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, table);
    			append_dev(table, thead);
    			append_dev(thead, tr);
    			append_dev(tr, th0);
    			append_dev(tr, t1);
    			append_dev(tr, th1);
    			append_dev(tr, t3);
    			append_dev(tr, th2);
    			append_dev(tr, t5);
    			append_dev(tr, th3);
    			append_dev(tr, t7);
    			append_dev(tr, th4);
    			append_dev(tr, t9);
    			append_dev(tr, th5);
    			append_dev(tr, t11);
    			append_dev(tr, th6);
    			append_dev(tr, t13);
    			append_dev(tr, th7);
    			append_dev(tr, t15);
    			append_dev(tr, th8);
    			append_dev(tr, t17);
    			append_dev(tr, th9);
    			append_dev(tr, t19);
    			append_dev(tr, th10);
    			append_dev(table, t21);
    			append_dev(table, tbody);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(tbody, null);
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*questionData*/ 1) {
    				each_value = /*questionData*/ ctx[0];
    				validate_each_argument(each_value);
    				for (let i = 0; i < each_blocks.length; i += 1) each_blocks[i].r();
    				validate_each_keys(ctx, each_value, get_each_context$1, get_key);
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, tbody, fix_and_destroy_block, create_each_block$1, null, get_each_context$1);
    				for (let i = 0; i < each_blocks.length; i += 1) each_blocks[i].a();
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].d();
    			}
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Table', slots, []);
    	let { questionData } = $$props;
    	const writable_props = ['questionData'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Table> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('questionData' in $$props) $$invalidate(0, questionData = $$props.questionData);
    	};

    	$$self.$capture_state = () => ({ flip, questionData });

    	$$self.$inject_state = $$props => {
    		if ('questionData' in $$props) $$invalidate(0, questionData = $$props.questionData);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [questionData];
    }

    class Table extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, { questionData: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Table",
    			options,
    			id: create_fragment$3.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*questionData*/ ctx[0] === undefined && !('questionData' in props)) {
    			console.warn("<Table> was created without expected prop 'questionData'");
    		}
    	}

    	get questionData() {
    		throw new Error("<Table>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set questionData(value) {
    		throw new Error("<Table>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    let data = [];

    var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

    function createCommonjsModule(fn) {
      var module = { exports: {} };
    	return fn(module, module.exports), module.exports;
    }

    /* @license
    Papa Parse
    v5.3.1
    https://github.com/mholt/PapaParse
    License: MIT
    */

    var papaparse_min = createCommonjsModule(function (module, exports) {
    !function(e,t){module.exports=t();}(commonjsGlobal,function s(){var f="undefined"!=typeof self?self:"undefined"!=typeof window?window:void 0!==f?f:{};var n=!f.document&&!!f.postMessage,o=n&&/blob:/i.test((f.location||{}).protocol),a={},h=0,b={parse:function(e,t){var i=(t=t||{}).dynamicTyping||!1;M(i)&&(t.dynamicTypingFunction=i,i={});if(t.dynamicTyping=i,t.transform=!!M(t.transform)&&t.transform,t.worker&&b.WORKERS_SUPPORTED){var r=function(){if(!b.WORKERS_SUPPORTED)return !1;var e=(i=f.URL||f.webkitURL||null,r=s.toString(),b.BLOB_URL||(b.BLOB_URL=i.createObjectURL(new Blob(["(",r,")();"],{type:"text/javascript"})))),t=new f.Worker(e);var i,r;return t.onmessage=_,t.id=h++,a[t.id]=t}();return r.userStep=t.step,r.userChunk=t.chunk,r.userComplete=t.complete,r.userError=t.error,t.step=M(t.step),t.chunk=M(t.chunk),t.complete=M(t.complete),t.error=M(t.error),delete t.worker,void r.postMessage({input:e,config:t,workerId:r.id})}var n=null;b.NODE_STREAM_INPUT,"string"==typeof e?n=t.download?new l(t):new p(t):!0===e.readable&&M(e.read)&&M(e.on)?n=new g(t):(f.File&&e instanceof File||e instanceof Object)&&(n=new c(t));return n.stream(e)},unparse:function(e,t){var n=!1,_=!0,m=",",y="\r\n",s='"',a=s+s,i=!1,r=null,o=!1;!function(){if("object"!=typeof t)return;"string"!=typeof t.delimiter||b.BAD_DELIMITERS.filter(function(e){return -1!==t.delimiter.indexOf(e)}).length||(m=t.delimiter);("boolean"==typeof t.quotes||"function"==typeof t.quotes||Array.isArray(t.quotes))&&(n=t.quotes);"boolean"!=typeof t.skipEmptyLines&&"string"!=typeof t.skipEmptyLines||(i=t.skipEmptyLines);"string"==typeof t.newline&&(y=t.newline);"string"==typeof t.quoteChar&&(s=t.quoteChar);"boolean"==typeof t.header&&(_=t.header);if(Array.isArray(t.columns)){if(0===t.columns.length)throw new Error("Option columns is empty");r=t.columns;}void 0!==t.escapeChar&&(a=t.escapeChar+s);"boolean"==typeof t.escapeFormulae&&(o=t.escapeFormulae);}();var h=new RegExp(j(s),"g");"string"==typeof e&&(e=JSON.parse(e));if(Array.isArray(e)){if(!e.length||Array.isArray(e[0]))return u(null,e,i);if("object"==typeof e[0])return u(r||Object.keys(e[0]),e,i)}else if("object"==typeof e)return "string"==typeof e.data&&(e.data=JSON.parse(e.data)),Array.isArray(e.data)&&(e.fields||(e.fields=e.meta&&e.meta.fields),e.fields||(e.fields=Array.isArray(e.data[0])?e.fields:"object"==typeof e.data[0]?Object.keys(e.data[0]):[]),Array.isArray(e.data[0])||"object"==typeof e.data[0]||(e.data=[e.data])),u(e.fields||[],e.data||[],i);throw new Error("Unable to serialize unrecognized input");function u(e,t,i){var r="";"string"==typeof e&&(e=JSON.parse(e)),"string"==typeof t&&(t=JSON.parse(t));var n=Array.isArray(e)&&0<e.length,s=!Array.isArray(t[0]);if(n&&_){for(var a=0;a<e.length;a++)0<a&&(r+=m),r+=v(e[a],a);0<t.length&&(r+=y);}for(var o=0;o<t.length;o++){var h=n?e.length:t[o].length,u=!1,f=n?0===Object.keys(t[o]).length:0===t[o].length;if(i&&!n&&(u="greedy"===i?""===t[o].join("").trim():1===t[o].length&&0===t[o][0].length),"greedy"===i&&n){for(var d=[],l=0;l<h;l++){var c=s?e[l]:l;d.push(t[o][c]);}u=""===d.join("").trim();}if(!u){for(var p=0;p<h;p++){0<p&&!f&&(r+=m);var g=n&&s?e[p]:p;r+=v(t[o][g],p);}o<t.length-1&&(!i||0<h&&!f)&&(r+=y);}}return r}function v(e,t){if(null==e)return "";if(e.constructor===Date)return JSON.stringify(e).slice(1,25);!0===o&&"string"==typeof e&&null!==e.match(/^[=+\-@].*$/)&&(e="'"+e);var i=e.toString().replace(h,a),r="boolean"==typeof n&&n||"function"==typeof n&&n(e,t)||Array.isArray(n)&&n[t]||function(e,t){for(var i=0;i<t.length;i++)if(-1<e.indexOf(t[i]))return !0;return !1}(i,b.BAD_DELIMITERS)||-1<i.indexOf(m)||" "===i.charAt(0)||" "===i.charAt(i.length-1);return r?s+i+s:i}}};if(b.RECORD_SEP=String.fromCharCode(30),b.UNIT_SEP=String.fromCharCode(31),b.BYTE_ORDER_MARK="\ufeff",b.BAD_DELIMITERS=["\r","\n",'"',b.BYTE_ORDER_MARK],b.WORKERS_SUPPORTED=!n&&!!f.Worker,b.NODE_STREAM_INPUT=1,b.LocalChunkSize=10485760,b.RemoteChunkSize=5242880,b.DefaultDelimiter=",",b.Parser=E,b.ParserHandle=i,b.NetworkStreamer=l,b.FileStreamer=c,b.StringStreamer=p,b.ReadableStreamStreamer=g,f.jQuery){var d=f.jQuery;d.fn.parse=function(o){var i=o.config||{},h=[];return this.each(function(e){if(!("INPUT"===d(this).prop("tagName").toUpperCase()&&"file"===d(this).attr("type").toLowerCase()&&f.FileReader)||!this.files||0===this.files.length)return !0;for(var t=0;t<this.files.length;t++)h.push({file:this.files[t],inputElem:this,instanceConfig:d.extend({},i)});}),e(),this;function e(){if(0!==h.length){var e,t,i,r,n=h[0];if(M(o.before)){var s=o.before(n.file,n.inputElem);if("object"==typeof s){if("abort"===s.action)return e="AbortError",t=n.file,i=n.inputElem,r=s.reason,void(M(o.error)&&o.error({name:e},t,i,r));if("skip"===s.action)return void u();"object"==typeof s.config&&(n.instanceConfig=d.extend(n.instanceConfig,s.config));}else if("skip"===s)return void u()}var a=n.instanceConfig.complete;n.instanceConfig.complete=function(e){M(a)&&a(e,n.file,n.inputElem),u();},b.parse(n.file,n.instanceConfig);}else M(o.complete)&&o.complete();}function u(){h.splice(0,1),e();}};}function u(e){this._handle=null,this._finished=!1,this._completed=!1,this._halted=!1,this._input=null,this._baseIndex=0,this._partialLine="",this._rowCount=0,this._start=0,this._nextChunk=null,this.isFirstChunk=!0,this._completeResults={data:[],errors:[],meta:{}},function(e){var t=w(e);t.chunkSize=parseInt(t.chunkSize),e.step||e.chunk||(t.chunkSize=null);this._handle=new i(t),(this._handle.streamer=this)._config=t;}.call(this,e),this.parseChunk=function(e,t){if(this.isFirstChunk&&M(this._config.beforeFirstChunk)){var i=this._config.beforeFirstChunk(e);void 0!==i&&(e=i);}this.isFirstChunk=!1,this._halted=!1;var r=this._partialLine+e;this._partialLine="";var n=this._handle.parse(r,this._baseIndex,!this._finished);if(!this._handle.paused()&&!this._handle.aborted()){var s=n.meta.cursor;this._finished||(this._partialLine=r.substring(s-this._baseIndex),this._baseIndex=s),n&&n.data&&(this._rowCount+=n.data.length);var a=this._finished||this._config.preview&&this._rowCount>=this._config.preview;if(o)f.postMessage({results:n,workerId:b.WORKER_ID,finished:a});else if(M(this._config.chunk)&&!t){if(this._config.chunk(n,this._handle),this._handle.paused()||this._handle.aborted())return void(this._halted=!0);n=void 0,this._completeResults=void 0;}return this._config.step||this._config.chunk||(this._completeResults.data=this._completeResults.data.concat(n.data),this._completeResults.errors=this._completeResults.errors.concat(n.errors),this._completeResults.meta=n.meta),this._completed||!a||!M(this._config.complete)||n&&n.meta.aborted||(this._config.complete(this._completeResults,this._input),this._completed=!0),a||n&&n.meta.paused||this._nextChunk(),n}this._halted=!0;},this._sendError=function(e){M(this._config.error)?this._config.error(e):o&&this._config.error&&f.postMessage({workerId:b.WORKER_ID,error:e,finished:!1});};}function l(e){var r;(e=e||{}).chunkSize||(e.chunkSize=b.RemoteChunkSize),u.call(this,e),this._nextChunk=n?function(){this._readChunk(),this._chunkLoaded();}:function(){this._readChunk();},this.stream=function(e){this._input=e,this._nextChunk();},this._readChunk=function(){if(this._finished)this._chunkLoaded();else {if(r=new XMLHttpRequest,this._config.withCredentials&&(r.withCredentials=this._config.withCredentials),n||(r.onload=v(this._chunkLoaded,this),r.onerror=v(this._chunkError,this)),r.open(this._config.downloadRequestBody?"POST":"GET",this._input,!n),this._config.downloadRequestHeaders){var e=this._config.downloadRequestHeaders;for(var t in e)r.setRequestHeader(t,e[t]);}if(this._config.chunkSize){var i=this._start+this._config.chunkSize-1;r.setRequestHeader("Range","bytes="+this._start+"-"+i);}try{r.send(this._config.downloadRequestBody);}catch(e){this._chunkError(e.message);}n&&0===r.status&&this._chunkError();}},this._chunkLoaded=function(){4===r.readyState&&(r.status<200||400<=r.status?this._chunkError():(this._start+=this._config.chunkSize?this._config.chunkSize:r.responseText.length,this._finished=!this._config.chunkSize||this._start>=function(e){var t=e.getResponseHeader("Content-Range");if(null===t)return -1;return parseInt(t.substring(t.lastIndexOf("/")+1))}(r),this.parseChunk(r.responseText)));},this._chunkError=function(e){var t=r.statusText||e;this._sendError(new Error(t));};}function c(e){var r,n;(e=e||{}).chunkSize||(e.chunkSize=b.LocalChunkSize),u.call(this,e);var s="undefined"!=typeof FileReader;this.stream=function(e){this._input=e,n=e.slice||e.webkitSlice||e.mozSlice,s?((r=new FileReader).onload=v(this._chunkLoaded,this),r.onerror=v(this._chunkError,this)):r=new FileReaderSync,this._nextChunk();},this._nextChunk=function(){this._finished||this._config.preview&&!(this._rowCount<this._config.preview)||this._readChunk();},this._readChunk=function(){var e=this._input;if(this._config.chunkSize){var t=Math.min(this._start+this._config.chunkSize,this._input.size);e=n.call(e,this._start,t);}var i=r.readAsText(e,this._config.encoding);s||this._chunkLoaded({target:{result:i}});},this._chunkLoaded=function(e){this._start+=this._config.chunkSize,this._finished=!this._config.chunkSize||this._start>=this._input.size,this.parseChunk(e.target.result);},this._chunkError=function(){this._sendError(r.error);};}function p(e){var i;u.call(this,e=e||{}),this.stream=function(e){return i=e,this._nextChunk()},this._nextChunk=function(){if(!this._finished){var e,t=this._config.chunkSize;return t?(e=i.substring(0,t),i=i.substring(t)):(e=i,i=""),this._finished=!i,this.parseChunk(e)}};}function g(e){u.call(this,e=e||{});var t=[],i=!0,r=!1;this.pause=function(){u.prototype.pause.apply(this,arguments),this._input.pause();},this.resume=function(){u.prototype.resume.apply(this,arguments),this._input.resume();},this.stream=function(e){this._input=e,this._input.on("data",this._streamData),this._input.on("end",this._streamEnd),this._input.on("error",this._streamError);},this._checkIsFinished=function(){r&&1===t.length&&(this._finished=!0);},this._nextChunk=function(){this._checkIsFinished(),t.length?this.parseChunk(t.shift()):i=!0;},this._streamData=v(function(e){try{t.push("string"==typeof e?e:e.toString(this._config.encoding)),i&&(i=!1,this._checkIsFinished(),this.parseChunk(t.shift()));}catch(e){this._streamError(e);}},this),this._streamError=v(function(e){this._streamCleanUp(),this._sendError(e);},this),this._streamEnd=v(function(){this._streamCleanUp(),r=!0,this._streamData("");},this),this._streamCleanUp=v(function(){this._input.removeListener("data",this._streamData),this._input.removeListener("end",this._streamEnd),this._input.removeListener("error",this._streamError);},this);}function i(m){var a,o,h,r=Math.pow(2,53),n=-r,s=/^\s*-?(\d+\.?|\.\d+|\d+\.\d+)([eE][-+]?\d+)?\s*$/,u=/^(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-][0-2]\d:[0-5]\d|Z))|(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z))|(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z))$/,t=this,i=0,f=0,d=!1,e=!1,l=[],c={data:[],errors:[],meta:{}};if(M(m.step)){var p=m.step;m.step=function(e){if(c=e,_())g();else {if(g(),0===c.data.length)return;i+=e.data.length,m.preview&&i>m.preview?o.abort():(c.data=c.data[0],p(c,t));}};}function y(e){return "greedy"===m.skipEmptyLines?""===e.join("").trim():1===e.length&&0===e[0].length}function g(){if(c&&h&&(k("Delimiter","UndetectableDelimiter","Unable to auto-detect delimiting character; defaulted to '"+b.DefaultDelimiter+"'"),h=!1),m.skipEmptyLines)for(var e=0;e<c.data.length;e++)y(c.data[e])&&c.data.splice(e--,1);return _()&&function(){if(!c)return;function e(e,t){M(m.transformHeader)&&(e=m.transformHeader(e,t)),l.push(e);}if(Array.isArray(c.data[0])){for(var t=0;_()&&t<c.data.length;t++)c.data[t].forEach(e);c.data.splice(0,1);}else c.data.forEach(e);}(),function(){if(!c||!m.header&&!m.dynamicTyping&&!m.transform)return c;function e(e,t){var i,r=m.header?{}:[];for(i=0;i<e.length;i++){var n=i,s=e[i];m.header&&(n=i>=l.length?"__parsed_extra":l[i]),m.transform&&(s=m.transform(s,n)),s=v(n,s),"__parsed_extra"===n?(r[n]=r[n]||[],r[n].push(s)):r[n]=s;}return m.header&&(i>l.length?k("FieldMismatch","TooManyFields","Too many fields: expected "+l.length+" fields but parsed "+i,f+t):i<l.length&&k("FieldMismatch","TooFewFields","Too few fields: expected "+l.length+" fields but parsed "+i,f+t)),r}var t=1;!c.data.length||Array.isArray(c.data[0])?(c.data=c.data.map(e),t=c.data.length):c.data=e(c.data,0);m.header&&c.meta&&(c.meta.fields=l);return f+=t,c}()}function _(){return m.header&&0===l.length}function v(e,t){return i=e,m.dynamicTypingFunction&&void 0===m.dynamicTyping[i]&&(m.dynamicTyping[i]=m.dynamicTypingFunction(i)),!0===(m.dynamicTyping[i]||m.dynamicTyping)?"true"===t||"TRUE"===t||"false"!==t&&"FALSE"!==t&&(function(e){if(s.test(e)){var t=parseFloat(e);if(n<t&&t<r)return !0}return !1}(t)?parseFloat(t):u.test(t)?new Date(t):""===t?null:t):t;var i;}function k(e,t,i,r){var n={type:e,code:t,message:i};void 0!==r&&(n.row=r),c.errors.push(n);}this.parse=function(e,t,i){var r=m.quoteChar||'"';if(m.newline||(m.newline=function(e,t){e=e.substring(0,1048576);var i=new RegExp(j(t)+"([^]*?)"+j(t),"gm"),r=(e=e.replace(i,"")).split("\r"),n=e.split("\n"),s=1<n.length&&n[0].length<r[0].length;if(1===r.length||s)return "\n";for(var a=0,o=0;o<r.length;o++)"\n"===r[o][0]&&a++;return a>=r.length/2?"\r\n":"\r"}(e,r)),h=!1,m.delimiter)M(m.delimiter)&&(m.delimiter=m.delimiter(e),c.meta.delimiter=m.delimiter);else {var n=function(e,t,i,r,n){var s,a,o,h;n=n||[",","\t","|",";",b.RECORD_SEP,b.UNIT_SEP];for(var u=0;u<n.length;u++){var f=n[u],d=0,l=0,c=0;o=void 0;for(var p=new E({comments:r,delimiter:f,newline:t,preview:10}).parse(e),g=0;g<p.data.length;g++)if(i&&y(p.data[g]))c++;else {var _=p.data[g].length;l+=_,void 0!==o?0<_&&(d+=Math.abs(_-o),o=_):o=_;}0<p.data.length&&(l/=p.data.length-c),(void 0===a||d<=a)&&(void 0===h||h<l)&&1.99<l&&(a=d,s=f,h=l);}return {successful:!!(m.delimiter=s),bestDelimiter:s}}(e,m.newline,m.skipEmptyLines,m.comments,m.delimitersToGuess);n.successful?m.delimiter=n.bestDelimiter:(h=!0,m.delimiter=b.DefaultDelimiter),c.meta.delimiter=m.delimiter;}var s=w(m);return m.preview&&m.header&&s.preview++,a=e,o=new E(s),c=o.parse(a,t,i),g(),d?{meta:{paused:!0}}:c||{meta:{paused:!1}}},this.paused=function(){return d},this.pause=function(){d=!0,o.abort(),a=M(m.chunk)?"":a.substring(o.getCharIndex());},this.resume=function(){t.streamer._halted?(d=!1,t.streamer.parseChunk(a,!0)):setTimeout(t.resume,3);},this.aborted=function(){return e},this.abort=function(){e=!0,o.abort(),c.meta.aborted=!0,M(m.complete)&&m.complete(c),a="";};}function j(e){return e.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}function E(e){var S,O=(e=e||{}).delimiter,x=e.newline,I=e.comments,T=e.step,D=e.preview,A=e.fastMode,L=S=void 0===e.quoteChar?'"':e.quoteChar;if(void 0!==e.escapeChar&&(L=e.escapeChar),("string"!=typeof O||-1<b.BAD_DELIMITERS.indexOf(O))&&(O=","),I===O)throw new Error("Comment character same as delimiter");!0===I?I="#":("string"!=typeof I||-1<b.BAD_DELIMITERS.indexOf(I))&&(I=!1),"\n"!==x&&"\r"!==x&&"\r\n"!==x&&(x="\n");var F=0,z=!1;this.parse=function(r,t,i){if("string"!=typeof r)throw new Error("Input must be a string");var n=r.length,e=O.length,s=x.length,a=I.length,o=M(T),h=[],u=[],f=[],d=F=0;if(!r)return C();if(A||!1!==A&&-1===r.indexOf(S)){for(var l=r.split(x),c=0;c<l.length;c++){if(f=l[c],F+=f.length,c!==l.length-1)F+=x.length;else if(i)return C();if(!I||f.substring(0,a)!==I){if(o){if(h=[],k(f.split(O)),R(),z)return C()}else k(f.split(O));if(D&&D<=c)return h=h.slice(0,D),C(!0)}}return C()}for(var p=r.indexOf(O,F),g=r.indexOf(x,F),_=new RegExp(j(L)+j(S),"g"),m=r.indexOf(S,F);;)if(r[F]!==S)if(I&&0===f.length&&r.substring(F,F+a)===I){if(-1===g)return C();F=g+s,g=r.indexOf(x,F),p=r.indexOf(O,F);}else if(-1!==p&&(p<g||-1===g))f.push(r.substring(F,p)),F=p+e,p=r.indexOf(O,F);else {if(-1===g)break;if(f.push(r.substring(F,g)),w(g+s),o&&(R(),z))return C();if(D&&h.length>=D)return C(!0)}else for(m=F,F++;;){if(-1===(m=r.indexOf(S,m+1)))return i||u.push({type:"Quotes",code:"MissingQuotes",message:"Quoted field unterminated",row:h.length,index:F}),E();if(m===n-1)return E(r.substring(F,m).replace(_,S));if(S!==L||r[m+1]!==L){if(S===L||0===m||r[m-1]!==L){-1!==p&&p<m+1&&(p=r.indexOf(O,m+1)),-1!==g&&g<m+1&&(g=r.indexOf(x,m+1));var y=b(-1===g?p:Math.min(p,g));if(r[m+1+y]===O){f.push(r.substring(F,m).replace(_,S)),r[F=m+1+y+e]!==S&&(m=r.indexOf(S,F)),p=r.indexOf(O,F),g=r.indexOf(x,F);break}var v=b(g);if(r.substring(m+1+v,m+1+v+s)===x){if(f.push(r.substring(F,m).replace(_,S)),w(m+1+v+s),p=r.indexOf(O,F),m=r.indexOf(S,F),o&&(R(),z))return C();if(D&&h.length>=D)return C(!0);break}u.push({type:"Quotes",code:"InvalidQuotes",message:"Trailing quote on quoted field is malformed",row:h.length,index:F}),m++;}}else m++;}return E();function k(e){h.push(e),d=F;}function b(e){var t=0;if(-1!==e){var i=r.substring(m+1,e);i&&""===i.trim()&&(t=i.length);}return t}function E(e){return i||(void 0===e&&(e=r.substring(F)),f.push(e),F=n,k(f),o&&R()),C()}function w(e){F=e,k(f),f=[],g=r.indexOf(x,F);}function C(e){return {data:h,errors:u,meta:{delimiter:O,linebreak:x,aborted:z,truncated:!!e,cursor:d+(t||0)}}}function R(){T(C()),h=[],u=[];}},this.abort=function(){z=!0;},this.getCharIndex=function(){return F};}function _(e){var t=e.data,i=a[t.workerId],r=!1;if(t.error)i.userError(t.error,t.file);else if(t.results&&t.results.data){var n={abort:function(){r=!0,m(t.workerId,{data:[],errors:[],meta:{aborted:!0}});},pause:y,resume:y};if(M(i.userStep)){for(var s=0;s<t.results.data.length&&(i.userStep({data:t.results.data[s],errors:t.results.errors,meta:t.results.meta},n),!r);s++);delete t.results;}else M(i.userChunk)&&(i.userChunk(t.results,n,t.file),delete t.results);}t.finished&&!r&&m(t.workerId,t.results);}function m(e,t){var i=a[e];M(i.userComplete)&&i.userComplete(t),i.terminate(),delete a[e];}function y(){throw new Error("Not implemented.")}function w(e){if("object"!=typeof e||null===e)return e;var t=Array.isArray(e)?[]:{};for(var i in e)t[i]=w(e[i]);return t}function v(e,t){return function(){e.apply(t,arguments);}}function M(e){return "function"==typeof e}return o&&(f.onmessage=function(e){var t=e.data;void 0===b.WORKER_ID&&t&&(b.WORKER_ID=t.workerId);if("string"==typeof t.input)f.postMessage({workerId:b.WORKER_ID,results:b.parse(t.input,t.config),finished:!0});else if(f.File&&t.input instanceof File||t.input instanceof Object){var i=b.parse(t.input,t.config);i&&f.postMessage({workerId:b.WORKER_ID,results:i,finished:!0});}}),(l.prototype=Object.create(u.prototype)).constructor=l,(c.prototype=Object.create(u.prototype)).constructor=c,(p.prototype=Object.create(p.prototype)).constructor=p,(g.prototype=Object.create(u.prototype)).constructor=g,b});
    });

    /* src/File.svelte generated by Svelte v3.41.0 */

    const { console: console_1$1 } = globals;
    const file$2 = "src/File.svelte";

    function create_fragment$2(ctx) {
    	let div3;
    	let div2;
    	let div0;
    	let input;
    	let t0;
    	let div1;
    	let t1;
    	let hr;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div3 = element("div");
    			div2 = element("div");
    			div0 = element("div");
    			input = element("input");
    			t0 = space();
    			div1 = element("div");
    			t1 = space();
    			hr = element("hr");
    			attr_dev(input, "class", "form-control svelte-agu41x");
    			attr_dev(input, "type", "file");
    			attr_dev(input, "id", "formFile");
    			add_location(input, file$2, 29, 8, 689);
    			attr_dev(div0, "class", "text-left");
    			add_location(div0, file$2, 28, 8, 657);
    			attr_dev(div1, "class", "text-right");
    			add_location(div1, file$2, 32, 8, 799);
    			attr_dev(div2, "class", "mb-3 import svelte-agu41x");
    			add_location(div2, file$2, 27, 4, 623);
    			add_location(hr, file$2, 37, 4, 964);
    			add_location(div3, file$2, 26, 0, 613);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div3, anchor);
    			append_dev(div3, div2);
    			append_dev(div2, div0);
    			append_dev(div0, input);
    			append_dev(div2, t0);
    			append_dev(div2, div1);
    			append_dev(div3, t1);
    			append_dev(div3, hr);

    			if (!mounted) {
    				dispose = listen_dev(input, "change", /*readFile*/ ctx[0], false, false, false);
    				mounted = true;
    			}
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div3);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('File', slots, []);
    	const dispatch = createEventDispatcher();

    	function readFile() {
    		const file = document.getElementById('formFile').files[0];

    		papaparse_min.parse(file, {
    			delimiter: ",",
    			skipEmptyLines: true,
    			header: true,
    			complete: results => {
    				results.data.forEach(e => data.push(e));
    				dispatch('notify', 'updated');
    			}
    		});

    		console.log(data);
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1$1.warn(`<File> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		data,
    		Papa: papaparse_min,
    		createEventDispatcher,
    		dispatch,
    		readFile
    	});

    	return [readFile];
    }

    class File$1 extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "File",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    /* src/Data.svelte generated by Svelte v3.41.0 */

    const { Object: Object_1, console: console_1 } = globals;

    const file$1 = "src/Data.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[40] = list[i];
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[43] = list[i];
    	return child_ctx;
    }

    function get_each_context_2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[46] = list[i];
    	return child_ctx;
    }

    function get_each_context_3(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[49] = list[i];
    	return child_ctx;
    }

    // (131:12) {#each exams as examName}
    function create_each_block_3(ctx) {
    	let option;
    	let t_value = /*examName*/ ctx[49] + "";
    	let t;

    	const block = {
    		c: function create() {
    			option = element("option");
    			t = text(t_value);
    			option.__value = /*examName*/ ctx[49];
    			option.value = option.__value;
    			add_location(option, file$1, 131, 12, 4441);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, option, anchor);
    			append_dev(option, t);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(option);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_3.name,
    		type: "each",
    		source: "(131:12) {#each exams as examName}",
    		ctx
    	});

    	return block;
    }

    // (138:12) {#each years as examYear}
    function create_each_block_2(ctx) {
    	let option;
    	let t_value = /*examYear*/ ctx[46] + "";
    	let t;

    	const block = {
    		c: function create() {
    			option = element("option");
    			t = text(t_value);
    			option.__value = /*examYear*/ ctx[46];
    			option.value = option.__value;
    			add_location(option, file$1, 138, 12, 4854);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, option, anchor);
    			append_dev(option, t);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(option);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_2.name,
    		type: "each",
    		source: "(138:12) {#each years as examYear}",
    		ctx
    	});

    	return block;
    }

    // (146:12) {#each subjects as examSubject}
    function create_each_block_1(ctx) {
    	let option;
    	let t_value = /*examSubject*/ ctx[43] + "";
    	let t;

    	const block = {
    		c: function create() {
    			option = element("option");
    			t = text(t_value);
    			option.__value = /*examSubject*/ ctx[43];
    			option.value = option.__value;
    			add_location(option, file$1, 146, 12, 5269);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, option, anchor);
    			append_dev(option, t);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(option);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(146:12) {#each subjects as examSubject}",
    		ctx
    	});

    	return block;
    }

    // (153:12) {#each sections as subjectSection}
    function create_each_block(ctx) {
    	let option;
    	let t_value = /*subjectSection*/ ctx[40] + "";
    	let t;
    	let option_value_value;

    	const block = {
    		c: function create() {
    			option = element("option");
    			t = text(t_value);
    			option.__value = option_value_value = /*subjectSection*/ ctx[40];
    			option.value = option.__value;
    			add_location(option, file$1, 153, 12, 5729);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, option, anchor);
    			append_dev(option, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*sections*/ 1 && t_value !== (t_value = /*subjectSection*/ ctx[40] + "")) set_data_dev(t, t_value);

    			if (dirty[0] & /*sections*/ 1 && option_value_value !== (option_value_value = /*subjectSection*/ ctx[40])) {
    				prop_dev(option, "__value", option_value_value);
    				option.value = option.__value;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(option);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(153:12) {#each sections as subjectSection}",
    		ctx
    	});

    	return block;
    }

    // (191:8) {#if image_present}
    function create_if_block(ctx) {
    	let div;
    	let span0;
    	let t1;
    	let input;
    	let t2;
    	let span1;
    	let t3;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			span0 = element("span");
    			span0.textContent = "Image Name";
    			t1 = space();
    			input = element("input");
    			t2 = space();
    			span1 = element("span");
    			t3 = text("Generate & copy Image name");
    			attr_dev(span0, "class", "input-group-text");
    			attr_dev(span0, "id", "inputGroup-sizing-sm");
    			add_location(span0, file$1, 192, 16, 8269);
    			attr_dev(input, "type", "text");
    			attr_dev(input, "class", "form-control svelte-ahwf0c");
    			attr_dev(input, "aria-label", "Sizing example input");
    			attr_dev(input, "id", "copy-button");
    			attr_dev(input, "aria-describedby", "inputGroup-sizing-sm");
    			input.disabled = true;
    			add_location(input, file$1, 193, 16, 8360);
    			attr_dev(span1, "class", "input-group-text pointer cpy svelte-ahwf0c");
    			attr_dev(span1, "id", "inputGroup-sizing-sm ");
    			attr_dev(span1, "disabled", /*name_generated*/ ctx[2]);
    			add_location(span1, file$1, 194, 16, 8538);
    			attr_dev(div, "class", "input-group input-group-sm mb-3  svelte-ahwf0c");
    			add_location(div, file$1, 191, 12, 8206);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, span0);
    			append_dev(div, t1);
    			append_dev(div, input);
    			set_input_value(input, /*image*/ ctx[13]);
    			append_dev(div, t2);
    			append_dev(div, span1);
    			append_dev(span1, t3);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input, "input", /*input_input_handler*/ ctx[32]),
    					listen_dev(span1, "click", /*copy*/ ctx[18], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*image*/ 8192 && input.value !== /*image*/ ctx[13]) {
    				set_input_value(input, /*image*/ ctx[13]);
    			}

    			if (dirty[0] & /*name_generated*/ 4) {
    				attr_dev(span1, "disabled", /*name_generated*/ ctx[2]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(191:8) {#if image_present}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let div11;
    	let div0;
    	let select0;
    	let t0;
    	let span0;
    	let t2;
    	let select1;
    	let t3;
    	let div1;
    	let select2;
    	let t4;
    	let span1;
    	let t6;
    	let select3;
    	let t7;
    	let div2;
    	let span2;
    	let t9;
    	let textarea;
    	let t10;
    	let div10;
    	let div3;
    	let span3;
    	let t12;
    	let input0;
    	let t13;
    	let div4;
    	let span4;
    	let t15;
    	let input1;
    	let t16;
    	let div5;
    	let span5;
    	let t18;
    	let input2;
    	let t19;
    	let div6;
    	let span6;
    	let t21;
    	let input3;
    	let t22;
    	let div7;
    	let span7;
    	let t24;
    	let input4;
    	let t25;
    	let div8;
    	let input5;
    	let t26;
    	let label;
    	let t28;
    	let t29;
    	let div9;
    	let button0;
    	let t31;
    	let button1;
    	let mounted;
    	let dispose;
    	let each_value_3 = /*exams*/ ctx[14];
    	validate_each_argument(each_value_3);
    	let each_blocks_3 = [];

    	for (let i = 0; i < each_value_3.length; i += 1) {
    		each_blocks_3[i] = create_each_block_3(get_each_context_3(ctx, each_value_3, i));
    	}

    	let each_value_2 = /*years*/ ctx[16];
    	validate_each_argument(each_value_2);
    	let each_blocks_2 = [];

    	for (let i = 0; i < each_value_2.length; i += 1) {
    		each_blocks_2[i] = create_each_block_2(get_each_context_2(ctx, each_value_2, i));
    	}

    	let each_value_1 = /*subjects*/ ctx[15];
    	validate_each_argument(each_value_1);
    	let each_blocks_1 = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks_1[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	let each_value = /*sections*/ ctx[0];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	let if_block = /*image_present*/ ctx[1] && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			div11 = element("div");
    			div0 = element("div");
    			select0 = element("select");

    			for (let i = 0; i < each_blocks_3.length; i += 1) {
    				each_blocks_3[i].c();
    			}

    			t0 = space();
    			span0 = element("span");
    			span0.textContent = "Exam and Year";
    			t2 = space();
    			select1 = element("select");

    			for (let i = 0; i < each_blocks_2.length; i += 1) {
    				each_blocks_2[i].c();
    			}

    			t3 = space();
    			div1 = element("div");
    			select2 = element("select");

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			t4 = space();
    			span1 = element("span");
    			span1.textContent = "Subject and Section";
    			t6 = space();
    			select3 = element("select");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t7 = space();
    			div2 = element("div");
    			span2 = element("span");
    			span2.textContent = "Question";
    			t9 = space();
    			textarea = element("textarea");
    			t10 = space();
    			div10 = element("div");
    			div3 = element("div");
    			span3 = element("span");
    			span3.textContent = "Answer";
    			t12 = space();
    			input0 = element("input");
    			t13 = space();
    			div4 = element("div");
    			span4 = element("span");
    			span4.textContent = "Option 1";
    			t15 = space();
    			input1 = element("input");
    			t16 = space();
    			div5 = element("div");
    			span5 = element("span");
    			span5.textContent = "Option 2";
    			t18 = space();
    			input2 = element("input");
    			t19 = space();
    			div6 = element("div");
    			span6 = element("span");
    			span6.textContent = "Option 3";
    			t21 = space();
    			input3 = element("input");
    			t22 = space();
    			div7 = element("div");
    			span7 = element("span");
    			span7.textContent = "Solution";
    			t24 = space();
    			input4 = element("input");
    			t25 = space();
    			div8 = element("div");
    			input5 = element("input");
    			t26 = space();
    			label = element("label");
    			label.textContent = "Tick here if the question has an image";
    			t28 = space();
    			if (if_block) if_block.c();
    			t29 = space();
    			div9 = element("div");
    			button0 = element("button");
    			button0.textContent = "Add question";
    			t31 = space();
    			button1 = element("button");
    			button1.textContent = "Export .csv";
    			attr_dev(select0, "class", "form-select svelte-ahwf0c");
    			attr_dev(select0, "aria-label", "Default select example");
    			if (/*exam*/ ctx[3] === void 0) add_render_callback(() => /*select0_change_handler*/ ctx[21].call(select0));
    			add_location(select0, file$1, 129, 8, 4305);
    			attr_dev(span0, "class", "input-group-text");
    			add_location(span0, file$1, 135, 8, 4658);
    			attr_dev(select1, "class", "form-select svelte-ahwf0c");
    			attr_dev(select1, "aria-label", "Default select example");
    			if (/*year*/ ctx[4] === void 0) add_render_callback(() => /*select1_change_handler*/ ctx[22].call(select1));
    			add_location(select1, file$1, 136, 8, 4718);
    			attr_dev(div0, "class", "input-group input-group-sm mb-3");
    			add_location(div0, file$1, 128, 4, 4251);
    			attr_dev(select2, "class", "form-select svelte-ahwf0c");
    			attr_dev(select2, "aria-label", "Default select example");
    			if (/*subject*/ ctx[5] === void 0) add_render_callback(() => /*select2_change_handler*/ ctx[23].call(select2));
    			add_location(select2, file$1, 144, 8, 5124);
    			attr_dev(span1, "class", "input-group-text");
    			add_location(span1, file$1, 150, 8, 5491);
    			attr_dev(select3, "class", "form-select svelte-ahwf0c");
    			attr_dev(select3, "aria-label", "Default select example");
    			if (/*section*/ ctx[6] === void 0) add_render_callback(() => /*select3_change_handler*/ ctx[24].call(select3));
    			add_location(select3, file$1, 151, 8, 5557);
    			attr_dev(div1, "class", "input-group input-group-sm mb-3 ");
    			add_location(div1, file$1, 143, 4, 5069);
    			attr_dev(span2, "class", "input-group-text");
    			add_location(span2, file$1, 159, 8, 5996);
    			attr_dev(textarea, "wrap", "soft");
    			attr_dev(textarea, "class", "form-control svelte-ahwf0c");
    			attr_dev(textarea, "aria-label", "With textarea");
    			add_location(textarea, file$1, 160, 8, 6051);
    			attr_dev(div2, "class", "input-group svelte-ahwf0c");
    			add_location(div2, file$1, 158, 4, 5962);
    			attr_dev(span3, "class", "input-group-text");
    			attr_dev(span3, "id", "inputGroup-sizing-sm");
    			add_location(span3, file$1, 164, 12, 6260);
    			attr_dev(input0, "type", "text");
    			attr_dev(input0, "placeholder", "Answer");
    			attr_dev(input0, "class", "form-control svelte-ahwf0c");
    			attr_dev(input0, "aria-label", "Sizing example input");
    			attr_dev(input0, "aria-describedby", "inputGroup-sizing-sm");
    			add_location(input0, file$1, 165, 12, 6343);
    			attr_dev(div3, "class", "input-group input-group-sm mb-3 svelte-ahwf0c");
    			add_location(div3, file$1, 163, 8, 6202);
    			attr_dev(span4, "class", "input-group-text");
    			attr_dev(span4, "id", "inputGroup-sizing-sm");
    			add_location(span4, file$1, 168, 12, 6582);
    			attr_dev(input1, "type", "text");
    			attr_dev(input1, "placeholder", "Option 1");
    			attr_dev(input1, "class", "form-control svelte-ahwf0c");
    			attr_dev(input1, "aria-label", "Sizing example input");
    			attr_dev(input1, "aria-describedby", "inputGroup-sizing-sm");
    			add_location(input1, file$1, 169, 12, 6667);
    			attr_dev(div4, "class", "input-group input-group-sm mb-3 svelte-ahwf0c");
    			add_location(div4, file$1, 167, 8, 6524);
    			attr_dev(span5, "class", "input-group-text");
    			attr_dev(span5, "id", "inputGroup-sizing-sm");
    			add_location(span5, file$1, 172, 12, 6909);
    			attr_dev(input2, "type", "text");
    			attr_dev(input2, "placeholder", "Option 2");
    			attr_dev(input2, "class", "form-control svelte-ahwf0c");
    			attr_dev(input2, "aria-label", "Sizing example input");
    			attr_dev(input2, "aria-describedby", "inputGroup-sizing-sm");
    			add_location(input2, file$1, 173, 12, 6994);
    			attr_dev(div5, "class", "input-group input-group-sm mb-3 svelte-ahwf0c");
    			add_location(div5, file$1, 171, 8, 6851);
    			attr_dev(span6, "class", "input-group-text");
    			attr_dev(span6, "id", "inputGroup-sizing-sm");
    			add_location(span6, file$1, 176, 12, 7237);
    			attr_dev(input3, "type", "text");
    			attr_dev(input3, "placeholder", "Option 3");
    			attr_dev(input3, "class", "form-control svelte-ahwf0c");
    			attr_dev(input3, "aria-label", "Sizing example input");
    			attr_dev(input3, "aria-describedby", "inputGroup-sizing-sm");
    			add_location(input3, file$1, 177, 12, 7322);
    			attr_dev(div6, "class", "input-group input-group-sm mb-3  svelte-ahwf0c");
    			add_location(div6, file$1, 175, 8, 7178);
    			attr_dev(span7, "class", "input-group-text");
    			attr_dev(span7, "id", "inputGroup-sizing-sm");
    			add_location(span7, file$1, 180, 12, 7565);
    			attr_dev(input4, "type", "text");
    			attr_dev(input4, "placeholder", "Solution");
    			attr_dev(input4, "class", "form-control svelte-ahwf0c");
    			attr_dev(input4, "aria-label", "Sizing example input");
    			attr_dev(input4, "aria-describedby", "inputGroup-sizing-sm");
    			add_location(input4, file$1, 181, 12, 7650);
    			attr_dev(div7, "class", "input-group input-group-sm mb-3  svelte-ahwf0c");
    			add_location(div7, file$1, 179, 8, 7506);
    			attr_dev(input5, "class", "form-check-input");
    			attr_dev(input5, "type", "checkbox");
    			input5.__value = "";
    			input5.value = input5.__value;
    			attr_dev(input5, "id", "flexCheckDefault");
    			add_location(input5, file$1, 185, 12, 7873);
    			attr_dev(label, "class", "form-check-label");
    			attr_dev(label, "for", "flexCheckDefault");
    			add_location(label, file$1, 186, 12, 7996);
    			attr_dev(div8, "class", "form-check");
    			add_location(div8, file$1, 184, 8, 7836);
    			attr_dev(button0, "type", "button");
    			attr_dev(button0, "class", "button btn btn-success btn-sm  svelte-ahwf0c");
    			add_location(button0, file$1, 199, 12, 8776);
    			attr_dev(button1, "type", "button");
    			attr_dev(button1, "class", "button btn btn-primary btn-sm  svelte-ahwf0c");
    			attr_dev(button1, "id", "dwn-btn");
    			add_location(button1, file$1, 210, 12, 9105);
    			attr_dev(div9, "class", "right svelte-ahwf0c");
    			add_location(div9, file$1, 198, 8, 8744);
    			attr_dev(div10, "class", "options svelte-ahwf0c");
    			add_location(div10, file$1, 162, 4, 6172);
    			add_location(div11, file$1, 127, 0, 4241);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div11, anchor);
    			append_dev(div11, div0);
    			append_dev(div0, select0);

    			for (let i = 0; i < each_blocks_3.length; i += 1) {
    				each_blocks_3[i].m(select0, null);
    			}

    			select_option(select0, /*exam*/ ctx[3]);
    			append_dev(div0, t0);
    			append_dev(div0, span0);
    			append_dev(div0, t2);
    			append_dev(div0, select1);

    			for (let i = 0; i < each_blocks_2.length; i += 1) {
    				each_blocks_2[i].m(select1, null);
    			}

    			select_option(select1, /*year*/ ctx[4]);
    			append_dev(div11, t3);
    			append_dev(div11, div1);
    			append_dev(div1, select2);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].m(select2, null);
    			}

    			select_option(select2, /*subject*/ ctx[5]);
    			append_dev(div1, t4);
    			append_dev(div1, span1);
    			append_dev(div1, t6);
    			append_dev(div1, select3);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(select3, null);
    			}

    			select_option(select3, /*section*/ ctx[6]);
    			append_dev(div11, t7);
    			append_dev(div11, div2);
    			append_dev(div2, span2);
    			append_dev(div2, t9);
    			append_dev(div2, textarea);
    			set_input_value(textarea, /*question*/ ctx[7]);
    			append_dev(div11, t10);
    			append_dev(div11, div10);
    			append_dev(div10, div3);
    			append_dev(div3, span3);
    			append_dev(div3, t12);
    			append_dev(div3, input0);
    			set_input_value(input0, /*answer*/ ctx[8]);
    			append_dev(div10, t13);
    			append_dev(div10, div4);
    			append_dev(div4, span4);
    			append_dev(div4, t15);
    			append_dev(div4, input1);
    			set_input_value(input1, /*option1*/ ctx[9]);
    			append_dev(div10, t16);
    			append_dev(div10, div5);
    			append_dev(div5, span5);
    			append_dev(div5, t18);
    			append_dev(div5, input2);
    			set_input_value(input2, /*option2*/ ctx[10]);
    			append_dev(div10, t19);
    			append_dev(div10, div6);
    			append_dev(div6, span6);
    			append_dev(div6, t21);
    			append_dev(div6, input3);
    			set_input_value(input3, /*option3*/ ctx[11]);
    			append_dev(div10, t22);
    			append_dev(div10, div7);
    			append_dev(div7, span7);
    			append_dev(div7, t24);
    			append_dev(div7, input4);
    			set_input_value(input4, /*solution*/ ctx[12]);
    			append_dev(div10, t25);
    			append_dev(div10, div8);
    			append_dev(div8, input5);
    			input5.checked = /*image_present*/ ctx[1];
    			append_dev(div8, t26);
    			append_dev(div8, label);
    			append_dev(div10, t28);
    			if (if_block) if_block.m(div10, null);
    			append_dev(div10, t29);
    			append_dev(div10, div9);
    			append_dev(div9, button0);
    			append_dev(div9, t31);
    			append_dev(div9, button1);

    			if (!mounted) {
    				dispose = [
    					listen_dev(select0, "change", /*select0_change_handler*/ ctx[21]),
    					listen_dev(select1, "change", /*select1_change_handler*/ ctx[22]),
    					listen_dev(select2, "change", /*select2_change_handler*/ ctx[23]),
    					listen_dev(select3, "click", /*setSection*/ ctx[20], false, false, false),
    					listen_dev(select3, "change", /*select3_change_handler*/ ctx[24]),
    					listen_dev(textarea, "input", /*textarea_input_handler*/ ctx[25]),
    					listen_dev(input0, "input", /*input0_input_handler*/ ctx[26]),
    					listen_dev(input1, "input", /*input1_input_handler*/ ctx[27]),
    					listen_dev(input2, "input", /*input2_input_handler*/ ctx[28]),
    					listen_dev(input3, "input", /*input3_input_handler*/ ctx[29]),
    					listen_dev(input4, "input", /*input4_input_handler*/ ctx[30]),
    					listen_dev(input5, "change", /*input5_change_handler*/ ctx[31]),
    					listen_dev(
    						button0,
    						"click",
    						function () {
    							if (is_function(/*question*/ ctx[7] && /*answer*/ ctx[8] && /*option1*/ ctx[9] && /*option2*/ ctx[10] && /*option3*/ ctx[11] && /*subject*/ ctx[5]
    							? /*addQuestion*/ ctx[17]()
    							: alert("Fill in the required information"))) (/*question*/ ctx[7] && /*answer*/ ctx[8] && /*option1*/ ctx[9] && /*option2*/ ctx[10] && /*option3*/ ctx[11] && /*subject*/ ctx[5]
    							? /*addQuestion*/ ctx[17]()
    							: alert("Fill in the required information")).apply(this, arguments);
    						},
    						false,
    						false,
    						false
    					),
    					listen_dev(button1, "click", /*download*/ ctx[19], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty[0] & /*exams*/ 16384) {
    				each_value_3 = /*exams*/ ctx[14];
    				validate_each_argument(each_value_3);
    				let i;

    				for (i = 0; i < each_value_3.length; i += 1) {
    					const child_ctx = get_each_context_3(ctx, each_value_3, i);

    					if (each_blocks_3[i]) {
    						each_blocks_3[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_3[i] = create_each_block_3(child_ctx);
    						each_blocks_3[i].c();
    						each_blocks_3[i].m(select0, null);
    					}
    				}

    				for (; i < each_blocks_3.length; i += 1) {
    					each_blocks_3[i].d(1);
    				}

    				each_blocks_3.length = each_value_3.length;
    			}

    			if (dirty[0] & /*exam, exams*/ 16392) {
    				select_option(select0, /*exam*/ ctx[3]);
    			}

    			if (dirty[0] & /*years*/ 65536) {
    				each_value_2 = /*years*/ ctx[16];
    				validate_each_argument(each_value_2);
    				let i;

    				for (i = 0; i < each_value_2.length; i += 1) {
    					const child_ctx = get_each_context_2(ctx, each_value_2, i);

    					if (each_blocks_2[i]) {
    						each_blocks_2[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_2[i] = create_each_block_2(child_ctx);
    						each_blocks_2[i].c();
    						each_blocks_2[i].m(select1, null);
    					}
    				}

    				for (; i < each_blocks_2.length; i += 1) {
    					each_blocks_2[i].d(1);
    				}

    				each_blocks_2.length = each_value_2.length;
    			}

    			if (dirty[0] & /*year, years*/ 65552) {
    				select_option(select1, /*year*/ ctx[4]);
    			}

    			if (dirty[0] & /*subjects*/ 32768) {
    				each_value_1 = /*subjects*/ ctx[15];
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks_1[i]) {
    						each_blocks_1[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_1[i] = create_each_block_1(child_ctx);
    						each_blocks_1[i].c();
    						each_blocks_1[i].m(select2, null);
    					}
    				}

    				for (; i < each_blocks_1.length; i += 1) {
    					each_blocks_1[i].d(1);
    				}

    				each_blocks_1.length = each_value_1.length;
    			}

    			if (dirty[0] & /*subject, subjects*/ 32800) {
    				select_option(select2, /*subject*/ ctx[5]);
    			}

    			if (dirty[0] & /*sections*/ 1) {
    				each_value = /*sections*/ ctx[0];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(select3, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}

    			if (dirty[0] & /*section, sections*/ 65) {
    				select_option(select3, /*section*/ ctx[6]);
    			}

    			if (dirty[0] & /*question*/ 128) {
    				set_input_value(textarea, /*question*/ ctx[7]);
    			}

    			if (dirty[0] & /*answer*/ 256 && input0.value !== /*answer*/ ctx[8]) {
    				set_input_value(input0, /*answer*/ ctx[8]);
    			}

    			if (dirty[0] & /*option1*/ 512 && input1.value !== /*option1*/ ctx[9]) {
    				set_input_value(input1, /*option1*/ ctx[9]);
    			}

    			if (dirty[0] & /*option2*/ 1024 && input2.value !== /*option2*/ ctx[10]) {
    				set_input_value(input2, /*option2*/ ctx[10]);
    			}

    			if (dirty[0] & /*option3*/ 2048 && input3.value !== /*option3*/ ctx[11]) {
    				set_input_value(input3, /*option3*/ ctx[11]);
    			}

    			if (dirty[0] & /*solution*/ 4096 && input4.value !== /*solution*/ ctx[12]) {
    				set_input_value(input4, /*solution*/ ctx[12]);
    			}

    			if (dirty[0] & /*image_present*/ 2) {
    				input5.checked = /*image_present*/ ctx[1];
    			}

    			if (/*image_present*/ ctx[1]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					if_block.m(div10, t29);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div11);
    			destroy_each(each_blocks_3, detaching);
    			destroy_each(each_blocks_2, detaching);
    			destroy_each(each_blocks_1, detaching);
    			destroy_each(each_blocks, detaching);
    			if (if_block) if_block.d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Data', slots, []);
    	const dispatch = createEventDispatcher();
    	let exams = ['', 'CGL', 'CHSL', 'MTS'];
    	let subjects = ['', 'ra', 'ga', 'quant', 'eng'];
    	let years = ['', 2021, 2020, 2019, 2018, 2017, 2016, 2015];
    	let sections = [];

    	let quantSections = [
    		'',
    		'Time&Work',
    		'Pipe&Cistern',
    		'Time&Distance',
    		'Boat&Stream',
    		'Percentage',
    		'Profit&Loss',
    		'Mixture&Allegation',
    		'Ratio&Proportion',
    		'Partnership',
    		'Average',
    		'CompoundInterest',
    		'SimpleInterest',
    		'NumberSystem&Algebra',
    		'HCF&LCM',
    		'Geometry',
    		'CooradinateGeometry',
    		'Mensuration',
    		'Trigonometry',
    		'Height&Distance',
    		'DataInterpretation'
    	];

    	let raSections = [
    		'',
    		'AlphabetTest',
    		'Analogy',
    		'ArithemeticReasoning',
    		'BloodRelation',
    		'Classification',
    		'CodingDecoding',
    		'DistanceAndDirection',
    		'Syllogism',
    		'VennDiagram',
    		'MissingNumber',
    		'PaperCutting&Folding',
    		'EmbeddedFigures',
    		'FigureSeries',
    		'Cubes&Dices',
    		'MirrorImages',
    		'PatternCompletion',
    		'CountingFigures'
    	];

    	let gaSections = [
    		'',
    		'History',
    		'Geography',
    		'Biology',
    		'Economics',
    		'Polity',
    		'Physics',
    		'Computer',
    		'Chemistry'
    	];

    	let engSections = [
    		'',
    		'Errors',
    		'SentenceImprovement',
    		'Active&Passive',
    		'Direct&Indirect',
    		'FillInTheBlanks',
    		'Synonyms&Antonyms',
    		'OneWord',
    		'Idioms&Phrases',
    		'WordCorrection',
    		'Jumbled',
    		'Comprehension'
    	];

    	let image_present = false;
    	let name_generated = false;
    	let exam = '';
    	let year = '';
    	let subject = '';
    	let section = '';
    	let question = '';
    	let answer = '';
    	let option1 = '';
    	let option2 = '';
    	let option3 = '';
    	let solution = '';
    	let image = 'none';

    	const random = (length = 8) => {
    		return Math.random().toString(16).substr(2, length);
    	};

    	function addQuestion() {
    		if (image_present) {
    			$$invalidate(13, image = 'img-' + exam + '-' + year + '-' + subject + '-' + section + '-' + random());
    		} else {
    			$$invalidate(13, image = 'none');
    		}

    		let que = {
    			exam,
    			year,
    			subject,
    			section,
    			question,
    			answer,
    			option1,
    			option2,
    			option3,
    			solution,
    			image
    		};

    		data.unshift(que);
    		console.log(data);
    		$$invalidate(2, name_generated = false);
    		$$invalidate(7, question = '');
    		$$invalidate(8, answer = '');
    		$$invalidate(9, option1 = '');
    		$$invalidate(10, option2 = '');
    		$$invalidate(11, option3 = '');
    		$$invalidate(12, solution = '');
    		$$invalidate(13, image = 'none');
    		$$invalidate(1, image_present = false);
    		dispatch('notify', 'updated');
    	}

    	function copy() {
    		if (!name_generated) {
    			$$invalidate(13, image = 'img-' + exam + '_' + year + '_' + subject + '_' + section + '_' + random());

    			navigator.clipboard.writeText(image).then(() => {
    				
    			}).catch(err => {
    				alert('Error in copying text: ', err);
    			});

    			$$invalidate(2, name_generated = true);
    		} else {
    			alert('Already generated and copied');
    		}
    	}

    	// function convertToCsv(){
    	//     let csv = Papa.unparse(data)
    	//     return csv
    	// }
    	function convertToCsv() {
    		const items = data;
    		const replacer = (key, value) => value === null ? '' : value;
    		const header = Object.keys(items[0]);

    		const csv = [
    			header.join(','),
    			...items.map(row => header.map(fieldName => JSON.stringify(row[fieldName], replacer)).join(','))
    		].join('\r\n'); // header row first

    		console.log(csv);
    		return csv;
    	}

    	function download() {
    		let filename = "questions_" + exam + '_' + year + '_' + subject + '_' + section + '.csv';
    		let textInput = convertToCsv();
    		let element = document.createElement('a');
    		element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(textInput));
    		element.setAttribute('download', filename);
    		document.body.appendChild(element);
    		element.click();
    		document.body.removeChild(element);
    	}

    	// ['','ra', 'ga','quant','eng']
    	function setSection() {
    		if (subject == 'quant') {
    			return $$invalidate(0, sections = quantSections);
    		} else if (subject == 'ra') {
    			return $$invalidate(0, sections = raSections);
    		} else if (subject == 'ga') {
    			return $$invalidate(0, sections = gaSections);
    		} else if (subject == 'eng') {
    			return $$invalidate(0, sections = engSections);
    		}
    	}

    	const writable_props = [];

    	Object_1.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1.warn(`<Data> was created with unknown prop '${key}'`);
    	});

    	function select0_change_handler() {
    		exam = select_value(this);
    		$$invalidate(3, exam);
    		$$invalidate(14, exams);
    	}

    	function select1_change_handler() {
    		year = select_value(this);
    		$$invalidate(4, year);
    		$$invalidate(16, years);
    	}

    	function select2_change_handler() {
    		subject = select_value(this);
    		$$invalidate(5, subject);
    		$$invalidate(15, subjects);
    	}

    	function select3_change_handler() {
    		section = select_value(this);
    		$$invalidate(6, section);
    		$$invalidate(0, sections);
    	}

    	function textarea_input_handler() {
    		question = this.value;
    		$$invalidate(7, question);
    	}

    	function input0_input_handler() {
    		answer = this.value;
    		$$invalidate(8, answer);
    	}

    	function input1_input_handler() {
    		option1 = this.value;
    		$$invalidate(9, option1);
    	}

    	function input2_input_handler() {
    		option2 = this.value;
    		$$invalidate(10, option2);
    	}

    	function input3_input_handler() {
    		option3 = this.value;
    		$$invalidate(11, option3);
    	}

    	function input4_input_handler() {
    		solution = this.value;
    		$$invalidate(12, solution);
    	}

    	function input5_change_handler() {
    		image_present = this.checked;
    		$$invalidate(1, image_present);
    	}

    	function input_input_handler() {
    		image = this.value;
    		$$invalidate(13, image);
    	}

    	$$self.$capture_state = () => ({
    		data,
    		createEventDispatcher,
    		dispatch,
    		exams,
    		subjects,
    		years,
    		sections,
    		quantSections,
    		raSections,
    		gaSections,
    		engSections,
    		image_present,
    		name_generated,
    		exam,
    		year,
    		subject,
    		section,
    		question,
    		answer,
    		option1,
    		option2,
    		option3,
    		solution,
    		image,
    		random,
    		addQuestion,
    		copy,
    		convertToCsv,
    		download,
    		setSection
    	});

    	$$self.$inject_state = $$props => {
    		if ('exams' in $$props) $$invalidate(14, exams = $$props.exams);
    		if ('subjects' in $$props) $$invalidate(15, subjects = $$props.subjects);
    		if ('years' in $$props) $$invalidate(16, years = $$props.years);
    		if ('sections' in $$props) $$invalidate(0, sections = $$props.sections);
    		if ('quantSections' in $$props) quantSections = $$props.quantSections;
    		if ('raSections' in $$props) raSections = $$props.raSections;
    		if ('gaSections' in $$props) gaSections = $$props.gaSections;
    		if ('engSections' in $$props) engSections = $$props.engSections;
    		if ('image_present' in $$props) $$invalidate(1, image_present = $$props.image_present);
    		if ('name_generated' in $$props) $$invalidate(2, name_generated = $$props.name_generated);
    		if ('exam' in $$props) $$invalidate(3, exam = $$props.exam);
    		if ('year' in $$props) $$invalidate(4, year = $$props.year);
    		if ('subject' in $$props) $$invalidate(5, subject = $$props.subject);
    		if ('section' in $$props) $$invalidate(6, section = $$props.section);
    		if ('question' in $$props) $$invalidate(7, question = $$props.question);
    		if ('answer' in $$props) $$invalidate(8, answer = $$props.answer);
    		if ('option1' in $$props) $$invalidate(9, option1 = $$props.option1);
    		if ('option2' in $$props) $$invalidate(10, option2 = $$props.option2);
    		if ('option3' in $$props) $$invalidate(11, option3 = $$props.option3);
    		if ('solution' in $$props) $$invalidate(12, solution = $$props.solution);
    		if ('image' in $$props) $$invalidate(13, image = $$props.image);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		sections,
    		image_present,
    		name_generated,
    		exam,
    		year,
    		subject,
    		section,
    		question,
    		answer,
    		option1,
    		option2,
    		option3,
    		solution,
    		image,
    		exams,
    		subjects,
    		years,
    		addQuestion,
    		copy,
    		download,
    		setSection,
    		select0_change_handler,
    		select1_change_handler,
    		select2_change_handler,
    		select3_change_handler,
    		textarea_input_handler,
    		input0_input_handler,
    		input1_input_handler,
    		input2_input_handler,
    		input3_input_handler,
    		input4_input_handler,
    		input5_change_handler,
    		input_input_handler
    	];
    }

    class Data extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {}, null, [-1, -1]);

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Data",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* src/App.svelte generated by Svelte v3.41.0 */
    const file = "src/App.svelte";

    function create_fragment(ctx) {
    	let main;
    	let div3;
    	let div1;
    	let file_1;
    	let t0;
    	let div0;
    	let data_1;
    	let t1;
    	let div2;
    	let table;
    	let current;
    	file_1 = new File$1({ $$inline: true });
    	file_1.$on("notify", /*updateTable*/ ctx[1]);
    	data_1 = new Data({ $$inline: true });
    	data_1.$on("notify", /*updateTable*/ ctx[1]);

    	table = new Table({
    			props: { questionData: /*questions*/ ctx[0] },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			main = element("main");
    			div3 = element("div");
    			div1 = element("div");
    			create_component(file_1.$$.fragment);
    			t0 = space();
    			div0 = element("div");
    			create_component(data_1.$$.fragment);
    			t1 = space();
    			div2 = element("div");
    			create_component(table.$$.fragment);
    			attr_dev(div0, "class", "row");
    			add_location(div0, file, 19, 4, 339);
    			attr_dev(div1, "class", "col");
    			add_location(div1, file, 17, 5, 275);
    			attr_dev(div2, "class", "col");
    			attr_dev(div2, "id", "table");
    			add_location(div2, file, 23, 2, 421);
    			attr_dev(div3, "class", "row");
    			add_location(div3, file, 16, 3, 252);
    			add_location(main, file, 14, 0, 240);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, div3);
    			append_dev(div3, div1);
    			mount_component(file_1, div1, null);
    			append_dev(div1, t0);
    			append_dev(div1, div0);
    			mount_component(data_1, div0, null);
    			append_dev(div3, t1);
    			append_dev(div3, div2);
    			mount_component(table, div2, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const table_changes = {};
    			if (dirty & /*questions*/ 1) table_changes.questionData = /*questions*/ ctx[0];
    			table.$set(table_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(file_1.$$.fragment, local);
    			transition_in(data_1.$$.fragment, local);
    			transition_in(table.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(file_1.$$.fragment, local);
    			transition_out(data_1.$$.fragment, local);
    			transition_out(table.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			destroy_component(file_1);
    			destroy_component(data_1);
    			destroy_component(table);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	let questions = '';

    	function updateTable(event) {
    		$$invalidate(0, questions = data);
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		Table,
    		File: File$1,
    		Data,
    		data,
    		questions,
    		updateTable
    	});

    	$$self.$inject_state = $$props => {
    		if ('questions' in $$props) $$invalidate(0, questions = $$props.questions);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [questions, updateTable];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
      target: document.body,
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
