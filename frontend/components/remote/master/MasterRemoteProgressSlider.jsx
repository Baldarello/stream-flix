import {cloneElement, useState} from 'react';
import {Slider, sliderClasses} from '@mui/material';
import {formatTime} from './formatTime';

/**
 * ValueLabel wrapper that injects a stable `data-testid` on the rendered
 * value-label element and forwards the `open` state to the MUI open class.
 *
 * MUI 5.18's default `SliderValueLabel` only extracts `children`,
 * `className`, and `value` from props, silently dropping
 * `componentsProps.valueLabel['data-testid']`. By providing our own
 * component we can append the testid and the `MuiSlider-valueLabelOpen`
 * class (driven by the `open` prop MUI passes us) to the label element
 * directly while still reusing MUI's positioning/styling.
 */
const ValueLabel = (props) => {
    const {children, className, value, open} = props;
    if (!children) return null;
    const openClass = open ? sliderClasses.valueLabelOpen : '';
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
            <span className={sliderClasses.valueLabelCircle}>
                <span className={sliderClasses.valueLabelLabel}>{value}</span>
            </span>
        </span>,
    );
};

/**
 * Atomic progress slider for the master remote control view.
 *
 * Owns the in-progress drag state so the thumb follows the user in real
 * time and the parent view is not re-rendered by MobX on every tick. The
 * value label is rendered by MUI's built-in mechanism (positioned above
 * the thumb) and the slider exposes `aria-valuetext` with the formatted
 * time so assistive tech and the e2e test can read it.
 *
 * Props:
 * - progress: current playback percentage in 0..100.
 * - duration: total duration in seconds (used to format the time label).
 * - onSeek: invoked on release with the committed percentage value.
 */
export function MasterRemoteProgressSlider({progress, duration, onSeek}) {
    const [dragValue, setDragValue] = useState(null);
    const displayValue = dragValue !== null ? dragValue : progress;

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
            valueLabelDisplay="auto"
            valueLabelFormat={(value) => formatTime((value / 100) * duration)}
            components={{ValueLabel}}
        />
    );
}
