/**
 * Formats a number of seconds as MM:SS or H:MM:SS.
 *
 * Returns "00:00" for negative or NaN inputs so the master remote view
 * always shows a well-formed label even when the slave has not yet sent
 * a real duration/currentTime value.
 *
 * @param {number} timeInSeconds - The duration or current time in seconds.
 * @returns {string} The formatted time string.
 */
export const formatTime = (timeInSeconds) => {
    if (isNaN(timeInSeconds) || timeInSeconds < 0) {
        return '00:00';
    }
    const hours = Math.floor(timeInSeconds / 3600);
    const minutes = Math.floor((timeInSeconds % 3600) / 60);
    const seconds = Math.floor(timeInSeconds % 60);

    const formattedMinutes = String(minutes).padStart(2, '0');
    const formattedSeconds = String(seconds).padStart(2, '0');

    if (hours > 0) {
        return `${hours}:${formattedMinutes}:${formattedSeconds}`;
    }
    return `${formattedMinutes}:${formattedSeconds}`;
};
