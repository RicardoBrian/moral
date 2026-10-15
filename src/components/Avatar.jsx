import React, { useId } from 'react';

export const AVATAR_OPTIONS = {
  hairStyle: ['short', 'twoblock', 'wavy', 'ponytail', 'bob', 'spiky'],
  hairColor: ['#2b2d42', '#6f4e37', '#c9a227', '#94a3b8', '#b4462f', '#3182f6'],
  skinTone: ['#ffe0c7', '#f5c6a5', '#e0a985', '#b97a56', '#8a5636'],
  outfitStyle: ['cyber_suit', 'wizard_robe', 'royal_knight', 'hanbok_fusion', 'eco_ranger', 'street_hoodie', 'steampunk_explorer'],
  outfitColor: ['#3182f6', '#15b886', '#ff9f00', '#f04452', '#8b5cf6', '#00a6c8', '#ec4899', '#333d4b'],
  expression: ['smile', 'determined', 'curious'],
  accessory: ['eco_badge', 'glasses', 'headband', 'star_pendant', 'none'],
};

export const DEFAULT_CHARACTER = {
  hairStyle: 'short',
  hairColor: '#2b2d42',
  skinTone: '#f5c6a5',
  outfitStyle: 'eco_ranger',
  outfitColor: '#3182f6',
  expression: 'smile',
  accessory: 'eco_badge',
};

const INK = '#2b2f36';

export function WizardAvatar({ size = 120, className = '' }) {
  const uid = useId().replace(/:/g, '');
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" className={`avatar ${className}`} aria-hidden="true">
      <defs>
        <linearGradient id={`cloak${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#35557d" />
          <stop offset="100%" stopColor="#243a57" />
        </linearGradient>
      </defs>
      <circle cx="100" cy="100" r="96" fill="#eef2f6" />
      <path d="M 50 196 Q 40 120 75 105 L 125 105 Q 160 120 150 196 Z" fill={`url(#cloak${uid})`} />
      <path d="M 75 105 Q 100 135 125 105 Q 100 120 75 105 Z" fill="#fbbf24" />
      <circle cx="100" cy="132" r="4" fill="#fbbf24" />
      <circle cx="100" cy="152" r="4" fill="#fbbf24" />
      <circle cx="100" cy="172" r="4" fill="#fbbf24" />
      <path d="M 78 98 Q 100 158 122 98 Q 100 114 78 98 Z" fill="#f1f5f9" stroke="#dbe2ea" strokeWidth="2" />
      <ellipse cx="100" cy="85" rx="27" ry="31" fill="#ffd7b5" />
      <path d="M 88 80 Q 91 77 94 80" stroke={INK} strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M 106 80 Q 109 77 112 80" stroke={INK} strokeWidth="3" fill="none" strokeLinecap="round" />
      <ellipse cx="84" cy="90" rx="5" ry="3" fill="#f43f5e" opacity="0.25" />
      <ellipse cx="116" cy="90" rx="5" ry="3" fill="#f43f5e" opacity="0.25" />
      <path d="M 58 72 Q 100 50 142 72 Q 100 66 58 72 Z" fill="#2c4566" />
      <path d="M 70 68 Q 98 6 136 12 Q 106 36 130 68 Z" fill={`url(#cloak${uid})`} />
      <circle cx="137" cy="12" r="7" fill="#fde047" />
      <rect x="156" y="72" width="6" height="118" rx="3" fill="#8b5a2b" />
      <circle cx="159" cy="66" r="13" fill="#67e8f9" stroke="#ffffff" strokeWidth="3" />
    </svg>
  );
}

export default function Avatar({ character = {}, size = 140, className = '' }) {
  const c = { ...DEFAULT_CHARACTER, ...character };
  const { skinTone, hairStyle, hairColor, outfitStyle, outfitColor, expression, accessory } = c;
  const body = 'M 50 196 Q 40 135 75 120 L 125 120 Q 160 135 150 196 Z';

  return (
    <svg width={size} height={size} viewBox="0 0 200 200" className={`avatar ${className}`} aria-hidden="true">
      <circle cx="100" cy="100" r="96" fill="#eaf3ff" />

      {hairStyle === 'ponytail' && (
        <path d="M 125 70 C 160 80 165 140 145 160 C 138 135 140 105 120 85 Z" fill={hairColor} />
      )}
      {hairStyle === 'wavy' && (
        <path d="M 62 70 C 46 100 46 145 66 162 C 72 140 68 110 76 90 Z M 138 70 C 154 100 154 145 134 162 C 128 140 132 110 124 90 Z" fill={hairColor} />
      )}

      {outfitStyle === 'cyber_suit' && (
        <g>
          <polygon points="36,155 48,125 76,118 70,145" fill="#333d4b" />
          <polygon points="164,155 152,125 124,118 130,145" fill="#333d4b" />
          <path d={body} fill={outfitColor} />
          <polygon points="100,126 78,142 83,192 100,196 117,192 122,142" fill="#333d4b" />
          <circle cx="100" cy="152" r="11" fill="#0b3b4a" />
          <circle cx="100" cy="152" r="6" fill="#67e8f9" />
        </g>
      )}
      {outfitStyle === 'wizard_robe' && (
        <g>
          <path d="M 40 196 Q 32 128 68 114 L 132 114 Q 168 128 160 196 Z" fill="#312e81" />
          <path d={body} fill={outfitColor} />
          <path d="M 72 115 Q 100 138 128 115 Q 100 124 72 115 Z" fill="#fbbf24" />
          <circle cx="100" cy="129" r="6" fill="#fbbf24" />
          <line x1="100" y1="136" x2="100" y2="194" stroke="#fbbf24" strokeWidth="2.5" strokeDasharray="6,4" />
        </g>
      )}
      {outfitStyle === 'royal_knight' && (
        <g>
          <path d="M 36 196 Q 28 128 65 114 L 135 114 Q 172 128 164 196 Z" fill="#9f1d2c" />
          <path d={body} fill={outfitColor} />
          <path d="M 70 118 L 134 182 L 122 192 L 60 128 Z" fill="#fbbf24" />
          <rect x="42" y="125" width="22" height="8" rx="3" fill="#fbbf24" />
          <rect x="136" y="125" width="22" height="8" rx="3" fill="#fbbf24" />
        </g>
      )}
      {outfitStyle === 'hanbok_fusion' && (
        <g>
          <path d={body} fill={outfitColor} />
          <path d="M 75 120 L 105 150 L 98 158 L 68 126 Z" fill="#ffffff" />
          <path d="M 125 120 L 95 150 L 102 158 L 132 126 Z" fill="#ffffff" />
          <path d="M 98 152 L 88 186" stroke="#f04452" strokeWidth="4" strokeLinecap="round" />
          <path d="M 104 152 L 102 190" stroke="#3182f6" strokeWidth="3" strokeLinecap="round" />
          <circle cx="98" cy="155" r="4" fill="#15b886" />
        </g>
      )}
      {outfitStyle === 'eco_ranger' && (
        <g>
          <path d={body} fill={outfitColor} />
          <line x1="70" y1="122" x2="130" y2="186" stroke="#7c4a1e" strokeWidth="5" />
          <line x1="130" y1="122" x2="70" y2="186" stroke="#7c4a1e" strokeWidth="5" />
          <circle cx="100" cy="153" r="6" fill="#fbbf24" />
          <rect x="48" y="126" width="18" height="6" rx="2" fill="#15b886" />
          <rect x="134" y="126" width="18" height="6" rx="2" fill="#15b886" />
        </g>
      )}
      {outfitStyle === 'street_hoodie' && (
        <g>
          <path d={body} fill={outfitColor} />
          <path d="M 74 162 L 126 162 L 121 192 L 79 192 Z" fill="#000000" opacity="0.12" />
          <path d="M 90 122 L 88 152" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
          <path d="M 110 122 L 112 152" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
          <path d="M 68 102 C 60 122 140 122 132 102" stroke="#333d4b" strokeWidth="6" fill="none" strokeLinecap="round" />
          <ellipse cx="68" cy="104" rx="7" ry="11" fill="#333d4b" />
          <ellipse cx="132" cy="104" rx="7" ry="11" fill="#333d4b" />
        </g>
      )}
      {outfitStyle === 'steampunk_explorer' && (
        <g>
          <path d={body} fill="#fdf0d5" />
          <path d="M 50 196 L 78 196 L 82 120 Q 55 130 50 196 Z" fill={outfitColor} />
          <path d="M 150 196 L 122 196 L 118 120 Q 145 130 150 196 Z" fill={outfitColor} />
          <path d="M 82 146 Q 100 166 118 152" stroke="#d97706" strokeWidth="2.5" fill="none" strokeDasharray="3,2" />
          <circle cx="70" cy="150" r="6" fill="#d97706" />
        </g>
      )}

      <rect x="91" y="100" width="18" height="22" rx="4" fill={skinTone} />
      <ellipse cx="100" cy="78" rx="30" ry="34" fill={skinTone} />
      <ellipse cx="69" cy="80" rx="5" ry="8" fill={skinTone} />
      <ellipse cx="131" cy="80" rx="5" ry="8" fill={skinTone} />
      <ellipse cx="80" cy="89" rx="6" ry="3.5" fill="#f43f5e" opacity="0.22" />
      <ellipse cx="120" cy="89" rx="6" ry="3.5" fill="#f43f5e" opacity="0.22" />

      {expression === 'smile' && (
        <g>
          <ellipse cx="88" cy="75" rx="4" ry="5" fill={INK} />
          <ellipse cx="112" cy="75" rx="4" ry="5" fill={INK} />
          <path d="M 91 89 Q 100 97 109 89" stroke={INK} strokeWidth="3" fill="none" strokeLinecap="round" />
        </g>
      )}
      {expression === 'determined' && (
        <g>
          <path d="M 81 67 L 95 64" stroke={INK} strokeWidth="3" strokeLinecap="round" />
          <path d="M 105 64 L 119 67" stroke={INK} strokeWidth="3" strokeLinecap="round" />
          <ellipse cx="88" cy="75" rx="4" ry="4.5" fill={INK} />
          <ellipse cx="112" cy="75" rx="4" ry="4.5" fill={INK} />
          <path d="M 92 91 L 108 91" stroke={INK} strokeWidth="3" strokeLinecap="round" />
        </g>
      )}
      {expression === 'curious' && (
        <g>
          <circle cx="88" cy="74" r="5.5" fill={INK} />
          <circle cx="89.5" cy="72" r="2" fill="#ffffff" />
          <circle cx="112" cy="74" r="5.5" fill={INK} />
          <circle cx="113.5" cy="72" r="2" fill="#ffffff" />
          <ellipse cx="100" cy="92" rx="3.5" ry="4.5" fill={INK} />
        </g>
      )}

      {hairStyle === 'short' && (
        <path d="M 68 76 C 65 52 75 42 100 42 C 125 42 135 52 132 76 C 126 62 115 54 100 54 C 85 54 74 62 68 76 Z" fill={hairColor} />
      )}
      {hairStyle === 'twoblock' && (
        <path d="M 66 74 C 65 48 76 38 100 38 C 124 38 135 48 134 74 C 130 65 125 58 115 55 C 100 50 82 52 66 74 Z" fill={hairColor} />
      )}
      {hairStyle === 'wavy' && (
        <path d="M 66 85 C 60 55 75 40 100 40 C 125 40 140 55 134 85 C 128 66 116 56 100 56 C 84 56 72 66 66 85 Z" fill={hairColor} />
      )}
      {hairStyle === 'ponytail' && (
        <path d="M 68 76 C 66 50 78 42 100 42 C 122 42 134 50 132 76 C 125 62 115 56 100 56 C 85 56 75 62 68 76 Z" fill={hairColor} />
      )}
      {hairStyle === 'bob' && (
        <path d="M 65 94 C 60 55 72 40 100 40 C 128 40 140 55 135 94 C 125 80 128 60 100 60 C 72 60 75 80 65 94 Z" fill={hairColor} />
      )}
      {hairStyle === 'spiky' && (
        <polygon points="100,28 106,45 118,34 116,48 130,42 122,58 136,58 126,72 100,52 74,72 64,58 78,58 70,42 84,48 82,34 94,45" fill={hairColor} />
      )}

      {accessory === 'glasses' && (
        <g>
          <rect x="76" y="68" width="20" height="15" rx="5" fill="none" stroke={INK} strokeWidth="2.5" />
          <rect x="104" y="68" width="20" height="15" rx="5" fill="none" stroke={INK} strokeWidth="2.5" />
          <line x1="96" y1="74" x2="104" y2="74" stroke={INK} strokeWidth="2.5" />
        </g>
      )}
      {accessory === 'headband' && (
        <path d="M 68 62 Q 100 50 132 62" stroke="#f04452" strokeWidth="6" fill="none" strokeLinecap="round" />
      )}
      {accessory === 'eco_badge' && (
        <g transform="translate(124, 142)">
          <circle r="10" fill="#15b886" stroke="#ffffff" strokeWidth="2" />
          <path d="M -3 3 Q -5 -5 4 -4 Q 5 5 -3 3 Z" fill="#ffffff" />
        </g>
      )}
      {accessory === 'star_pendant' && (
        <polygon transform="translate(100, 136)" points="0,-8 2.4,-2.4 8,0 2.4,2.4 0,8 -2.4,2.4 -8,0 -2.4,-2.4" fill="#fbbf24" />
      )}
    </svg>
  );
}
