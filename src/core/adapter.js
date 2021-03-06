'use strict';

const Promise = require('bluebird');
const _       = require('lodash');
const Path    = require('path');
const mix     = require('./mixins/mix');
const Emitter = require('./mixins/emitter');

module.exports = class Adapter extends mix(Emitter) {

    constructor(engine, source) {
        super();
        this._engine = engine;
        this._source = source;
        this._views  = [];
        this._hasLoaded = false;
        source.on('loaded', () => this._onSourceChange());
        source.on('updated', eventData => this._onSourceChange(eventData));
    }

    get engine() {
        return this._engine;
    }

    get views() {
        return this._views;
    }

    load() {
        if (!this._hasLoaded) {
            this._loadViews();
        }
    }

    getView(handle) {
        handle = handle.replace(/^@/, '');
        return _.find(this._views, view => (view.handle.replace(/^@/, '')  === handle));
    }

    _loadViews() {
        let views = [];
        for (let item of this._source.flattenDeep()) {
            let view = {
                handle: `@${item.handle}`,
                path: item.viewPath,
                content: item.content
            };
            views.push(view);
            this.emit('view:added', view);
            if (item.alias) {
                let view = {
                    handle: `@${item.alias}`,
                    path: item.viewPath,
                    content: item.content
                };
                views.push(view);
                this.emit('view:added', view);
            }
        }
        this._views = views;
        this._hasLoaded = true;
        return views;
    }

    _updateView(view) {
        let entity = this._source.find(view.handle);
        if (entity) {
            view.content = entity.content;
            this.emit('view:updated', view);
        }
    }

    _onSourceChange(eventData) {
        if (eventData && eventData.isTemplate) {
            let touched = _.filter(this._views, ['path', Path.resolve(eventData.path)]);
            if (eventData.event === 'change') {
                touched.forEach(view => this._updateView(view));
                return this._views;
            } else if (eventData.event === 'unlink') {
                let touchedPaths = _.map(touched, view => view.path);
                this._views = _.reject(this._views, v => _.includes(touchedPaths, v.path));
                touched.forEach(view => this.emit('view:removed', view));
                return this._views;
            }
        }
        return this._loadViews();
    }

    _resolve(result) {
        return Promise.resolve(result);
    }

    render(path, str, context, meta) {
        throw new Error(`Template engine adapter classes must provide a 'render' method.`);
    }


}
