import {cloneElement, useState} from 'react';
import {Slider, sliderClasses} from '@mui/material';
import {formatTime} from './formatTime';

/**
 * Atomic progress slider for the master remote control view.
 *
 * Owns the in-progress drag state so the thumb follows the user in real
 * time and the parent view is not re-rendered by MobX on every tick.
 *
 * The value label is rendered by MUI's built-in mechanism (positioned
 * above the thumb) but its visibility is gated on the local drag state
 * rather than MUI's default `auto` behavior. This guarantees the label
 * is shown **only** while the user is actively sliding the thumb, and
 * never on idle/hover/focus/keyboard events. The final resting position
 * of the label above the slider track is controlled by a scoped rule in
 * `frontend/index.css` so it stays clear of the cursor on desktop and
 * the finger on mobile touch devices.
 *
 * Props:
 * - progress: current playback percentage in 0..100.
 * - duration: total duration in seconds (used to format the time label).
 * - onSeek: invoked on release with the committed percentage value.
 */
export function MasterRemoteProgressSlider({progress, duration, onSeek}) {
    const [dragValue, setDragValue] = useState(null);
    const displayValue = dragValue !== null ? dragValue : progress;

    /**
     * ValueLabel wrapper that injects a stable `data-testid` on the
     * rendered value-label element and drives the MUI open class from
     * the component-local drag state instead of MUI's own `open` prop.
     *
     * Defined inside the component so it can close over `dragValue`.
     * That means the `MuiSlider-valueLabelOpen` class — and therefore
     * the visible label — appears **only** while the user is dragging,
     * regardless of hover or focus on the thumb.
     *
     * MUI's default `SliderValueLabel` only extracts `children`,
     * `className`, and `value` from props, silently dropping
     * `componentsProps.valueLabel['data-testid']`. By providing our own
     * component we can append the testid and the open class directly
     * while still reusing MUI's positioning/styling.
     *
     * The label is rendered as a single span containing the formatted
     * time text (e.g. `20:00`); the visual pill background, padding,
     * and text color are defined in `frontend/index.css` under
     * `#master-remote-progress-slider .MuiSlider-valueLabel`.
     */
    const ValueLabel = (props) => {
        const {children, className, value} = props;
        if (!children) return null;
        const isDragging = dragValue !== null;
        const openClass = isDragging ? sliderClasses.valueLabelOpen : '';
        const finalClassName = [className, openClass].filter(Boolean).join(' ');
        return cloneElement(
            children,
            {className: children.props.className},
            children.props.children,
            <span
                className={finalClassName}
                data-testid="master-remote-slider-value-label"
                aria-hidden
            >
                {value}
            </span>,
        );
    };

    return (
        <Slider
            id="master-remote-progress-slider"
            className="video-player-slider"
            aria-label="progress"
            aria-valuetext={formatTime((displayValue / 100) * duration)}
            value={displayValue}
            onChange={(_, value) => setDragValue(value)}
            onChangeCommitted={(_, value) => {
                setDragValue(null);
                onSeek(_, value);
            }}
            valueLabelDisplay="on"
            valueLabelFormat={(value) => formatTime((value / 100) * duration)}
            components={{ValueLabel}}
        />
    );
}
