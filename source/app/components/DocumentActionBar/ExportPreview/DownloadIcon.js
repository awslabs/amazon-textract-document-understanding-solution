import css from './DownloadIcon.module.scss';
import cs from 'classnames'

const DownloadIcon = (props) => {
  return (
    <svg className={css.svg} viewBox='0 0 16 16' {...props}>
      <title>download</title>
      <g id='icons'>
        <polyline className={cs(css.shape, css.rounded)} points='11 2 14 2 14 14 2 14 2 2 5 2' />
        <polyline className={css.shape} points='4 6 8 10 12 6' />
        <line className={css.shape} x1='8' y1='1' x2='8' y2='10' />
      </g>
    </svg>
  );
};

export default DownloadIcon;
