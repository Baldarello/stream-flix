/**
 * @fileoverview FX Store - cinematic effects orchestration.
 *
 * Holds the observables used by the futuristic rework:
 * - `dockMode`: visual mode of the FloatingDock (extended | collapsed | mobile).
 * - `isTransitioning`: true while a route-change timeline is in flight.
 * - `prevViewKey` / `targetViewKey`: keys of the previous and next view used
 *   to pick a timeline from `motion/registry.js`.
 * - `isFirstPaint`: true until the first ViewSwitch branch is rendered, so
 *   the transition portal can skip the cinematic intro on cold start.
 *
 * Kept deliberately small and additive - never touches mediaStore's schema.
 */

import { makeAutoObservable } from 'mobx';

class FxStore {
    dockMode = 'extended';
    isTransitioning = false;
    prevViewKey = 'home';
    targetViewKey = 'home';
    isFirstPaint = true;
    transitionStartedAt = 0;

    constructor() {
        makeAutoObservable(this, {}, { autoBind: true });
    }

    setDockMode = (mode) => {
        this.dockMode = mode;
    };

    beginTransition = (fromKey, toKey) => {
        this.prevViewKey = fromKey;
        this.targetViewKey = toKey;
        this.isTransitioning = true;
        this.transitionStartedAt = Date.now();
    };

    endTransition = () => {
        this.isTransitioning = false;
        this.prevViewKey = this.targetViewKey;
    };

    markFirstPaintDone = () => {
        this.isFirstPaint = false;
    };

    setTargetViewKey = (key) => {
        this.prevViewKey = this.targetViewKey;
        this.targetViewKey = key;
    };
}

export const fxStore = new FxStore();
