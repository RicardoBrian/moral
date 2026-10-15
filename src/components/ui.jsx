import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Icon from './Icon.jsx';
import { WizardAvatar } from './Avatar.jsx';
import { useI18n } from '../i18n/index.jsx';
import { speak, stopSpeaking, onTtsChange, ttsSupported } from '../lib/tts.js';
import { checkText } from '../lib/validate.js';
import { audio } from '../lib/audio.js';

export function Button({ variant = 'primary', size = 'lg', block = false, loading = false, className = '', children, onClick, disabled, ...rest }) {
  return (
    <button
      type="button"
      className={`btn btn-${variant} btn-${size} ${block ? 'btn-block' : ''} ${loading ? 'is-loading' : ''} ${className}`}
      disabled={disabled || loading}
      onClick={(e) => {
        if (variant !== 'primary') audio.tap();
        if (onClick) onClick(e);
      }}
      {...rest}
    >
      {loading ? <span className="spinner" aria-hidden="true" /> : null}
      <span className="btn-label">{children}</span>
    </button>
  );
}

/** 화면 아래에 고정되는 주요 버튼 영역 */
export function BottomCTA({ children, note }) {
  return (
    <div className="bottom-cta">
      <div className="bottom-cta-inner">
        {note ? <div className="bottom-cta-note">{note}</div> : null}
        <div className="bottom-cta-row">{children}</div>
      </div>
    </div>
  );
}

export function Sheet({ open, onClose, title, children, actions, dismissible = true }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape' && dismissible && onClose) onClose(); };
    window.addEventListener('keydown', onKey);
    const t = setTimeout(() => {
      const el = ref.current && ref.current.querySelector('button, input, textarea');
      if (el) el.focus();
    }, 50);
    return () => { window.removeEventListener('keydown', onKey); clearTimeout(t); };
  }, [open, dismissible, onClose]);
  if (!open) return null;
  // body 로 바로 띄워야 흐림 효과가 있는 상단 바 안에서도 화면 전체를 덮습니다.
  return createPortal(
    <div className="sheet-layer" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget && dismissible && onClose) onClose(); }}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={typeof title === 'string' ? title : undefined} ref={ref}>
        <div className="sheet-handle" aria-hidden="true" />
        {title ? <h2 className="sheet-title">{title}</h2> : null}
        <div className="sheet-body">{children}</div>
        {actions ? <div className="sheet-actions">{actions}</div> : null}
      </div>
    </div>,
    document.body,
  );
}

export function Toggle({ checked, onChange, disabled, label, id }) {
  return (
    <button
      type="button"
      role="switch"
      id={id}
      aria-checked={checked}
      aria-label={label}
      className={`toggle ${checked ? 'on' : ''}`}
      disabled={disabled}
      onClick={() => onChange(!checked)}
    >
      <span className="toggle-knob" />
    </button>
  );
}

export function Segmented({ options, value, onChange, ariaLabel, size = 'md' }) {
  return (
    <div className={`segmented segmented-${size}`} role="radiogroup" aria-label={ariaLabel}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          className={`segmented-item ${value === o.value ? 'active' : ''}`}
          onClick={() => { if (value !== o.value) { audio.tap(); onChange(o.value); } }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Chips({ options, value, onChange, ariaLabel }) {
  return (
    <div className="chips" role="radiogroup" aria-label={ariaLabel}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          className={`chip ${value === o.value ? 'active' : ''}`}
          onClick={() => { audio.tap(); onChange(o.value); }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Swatches({ colors, value, onChange, ariaLabel }) {
  return (
    <div className="swatches" role="radiogroup" aria-label={ariaLabel}>
      {colors.map((c, i) => (
        <button
          key={c}
          type="button"
          role="radio"
          aria-checked={value === c}
          aria-label={`${ariaLabel} ${i + 1}`}
          className={`swatch ${value === c ? 'active' : ''}`}
          style={{ '--swatch': c }}
          onClick={() => { audio.tap(); onChange(c); }}
        />
      ))}
    </div>
  );
}

let speakSeq = 0;
export function SpeakButton({ text, compact = false }) {
  const { t, lang } = useI18n();
  const [id] = useState(() => `sp${++speakSeq}`);
  const [active, setActive] = useState(false);
  const activeRef = useRef(false);
  activeRef.current = active;
  useEffect(() => onTtsChange((cur) => setActive(cur === id)), [id]);
  // 화면이 바뀌어 버튼이 사라지면 읽기도 멈춥니다.
  useEffect(() => () => { if (activeRef.current) stopSpeaking(); }, []);
  if (!ttsSupported() || !text) return null;
  return (
    <button
      type="button"
      className={`speak-btn ${active ? 'active' : ''} ${compact ? 'compact' : ''}`}
      onClick={() => (active ? stopSpeaking() : speak(text, lang, id))}
      aria-label={active ? t('common.stop') : t('common.listen')}
    >
      <Icon name={active ? 'stop' : 'speaker'} size={16} />
      {!compact && <span>{active ? t('common.stop') : t('common.listen')}</span>}
    </button>
  );
}

/** 마법사 크로노스의 말풍선 안내 */
export function WizardBubble({ text, name }) {
  if (!text) return null;
  return (
    <div className="wizard-bubble">
      <WizardAvatar size={48} className="wizard-bubble-avatar" />
      <div className="wizard-bubble-body">
        {name ? <div className="wizard-bubble-name">{name}</div> : null}
        <p className="wizard-bubble-text">{text}</p>
        <SpeakButton text={text} compact />
      </div>
    </div>
  );
}

export function ProgressBar({ value }) {
  const pct = Math.max(0, Math.min(100, Math.round(value * 100)));
  return (
    <div className="progress" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div className="progress-fill" style={{ width: `${pct}%` }} />
    </div>
  );
}

export function TextField({ label, help, error, id, className = '', ...rest }) {
  return (
    <div className={`field ${error ? 'has-error' : ''} ${className}`}>
      {label ? <label className="field-label" htmlFor={id}>{label}</label> : null}
      <input id={id} className="field-input" aria-invalid={!!error} aria-describedby={error || help ? `${id}-desc` : undefined} {...rest} />
      {error ? <p className="field-error" id={`${id}-desc`}>{error}</p> : help ? <p className="field-help" id={`${id}-desc`}>{help}</p> : null}
    </div>
  );
}

/** 글자 수와 성의 있는 답인지를 함께 알려 주는 입력란 */
export function CheckedTextArea({ id, label, value, onChange, min, placeholder, rows = 4, showErrors }) {
  const { t } = useI18n();
  const res = checkText(value, min);
  let status = null;
  if (res.code === 'short') {
    status = <span className={`check-status ${showErrors && res.length > 0 ? 'warn' : 'muted'}`}>{t('text.short', { left: min - res.length })}</span>;
  } else if (!res.ok) {
    status = <span className="check-status warn"><Icon name="warning" size={14} /> {t(`text.${res.code}`)}</span>;
  } else {
    status = <span className="check-status ok"><Icon name="check" size={14} /> {t('text.ok')}</span>;
  }
  return (
    <div className="field">
      {label ? <label className="field-label" htmlFor={id}>{label}</label> : null}
      <textarea
        id={id}
        className="field-input field-textarea"
        rows={rows}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        // 휴대폰 키보드가 올라올 때 하단 버튼에 가리지 않도록 입력칸을 화면 가운데로 올립니다.
        onFocus={(e) => { const el = e.target; setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'center' }), 250); }}
        maxLength={1000}
      />
      <div className="check-row">
        {status}
        <span className="check-count">{t('text.count', { n: res.length, min })}</span>
      </div>
    </div>
  );
}

export function Spinner({ label }) {
  return (
    <div className="center-spinner" role="status">
      <span className="spinner spinner-lg" aria-hidden="true" />
      {label ? <span className="center-spinner-label">{label}</span> : null}
    </div>
  );
}
