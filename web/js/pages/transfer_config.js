// 整理配置页面组件（侧边栏 123 STRM 子页面）
const TRANSFER_BASIC_EDITOR_TYPES = [
    {
        key: 'movie',
        title: '电影重命名',
        shortTitle: '电影',
        configKey: 'movie_rename_format',
        icon: 'mdi-movie-open-outline',
        previewLabel: '电影示例预览',
    },
    {
        key: 'tv',
        title: '电视剧重命名',
        shortTitle: '电视剧',
        configKey: 'tv_rename_format',
        icon: 'mdi-television-classic',
        previewLabel: '电视剧示例预览',
    }
];

const TRANSFER_VISUAL_LEVEL_COUNT = {
    movie: 2,
    tv: 3,
};

const TRANSFER_LITERAL_PALETTE = [
    { key: 'space', label: '空格', display: ' ', value: ' ', type: 'separator', color: 'blue-grey', hue: 206, icon: 'mdi-keyboard-space' },
    { key: 'dash_spaced', label: '空格-空格', display: ' - ', value: ' - ', type: 'separator', color: 'blue-grey', hue: 220, icon: 'mdi-minus' },
    { key: 'dash', label: '短横线', display: '-', value: '-', type: 'separator', color: 'blue-grey', hue: 232, icon: 'mdi-minus' },
    { key: 'dot', label: '点号', display: '.', value: '.', type: 'separator', color: 'blue-grey', hue: 246, icon: 'mdi-circle-small' },
    { key: 'underscore', label: '下划线', display: '_', value: '_', type: 'separator', color: 'blue-grey', hue: 258, icon: 'mdi-minus' },
    { key: 'left_paren', label: '左括号', display: '(', value: '(', type: 'separator', color: 'blue-grey', hue: 176, icon: 'mdi-code-parentheses' },
    { key: 'right_paren', label: '右括号', display: ')', value: ')', type: 'separator', color: 'blue-grey', hue: 188, icon: 'mdi-code-parentheses' },
    { key: 'space_left_paren', label: '空格+左括号', display: ' (', value: ' (', type: 'separator', color: 'blue-grey', hue: 198, icon: 'mdi-code-parentheses' },
    { key: 'left_bracket', label: '左中括号', display: '[', value: '[', type: 'separator', color: 'blue-grey', hue: 156, icon: 'mdi-code-brackets' },
    { key: 'right_bracket', label: '右中括号', display: ']', value: ']', type: 'separator', color: 'blue-grey', hue: 168, icon: 'mdi-code-brackets' },
    { key: 'left_brace', label: '左花括号', display: '{', value: '{', type: 'separator', color: 'blue-grey', hue: 140, icon: 'mdi-code-braces' },
    { key: 'right_brace', label: '右花括号', display: '}', value: '}', type: 'separator', color: 'blue-grey', hue: 152, icon: 'mdi-code-braces' },
    { key: 'space_left_brace', label: '空格+左花括号', display: ' {', value: ' {', type: 'separator', color: 'blue-grey', hue: 146, icon: 'mdi-code-braces' },
];

const TRANSFER_LITERAL_PARSE_OPTIONS = TRANSFER_LITERAL_PALETTE
    .slice()
    .sort((a, b) => b.value.length - a.value.length);

let transferVisualBlockSeed = 0;

function nextTransferVisualId(prefix = 'blk') {
    transferVisualBlockSeed += 1;
    return `${prefix}_${transferVisualBlockSeed}`;
}

function createVisualLevel(blocks = []) {
    return {
        id: nextTransferVisualId('lvl'),
        blocks,
    };
}

function getTransferVisualLevelCount(editorKey = 'movie') {
    return TRANSFER_VISUAL_LEVEL_COUNT[editorKey] || 1;
}

function createEmptyVisualEditor(editorKey = 'movie') {
    return {
        levels: Array.from({ length: getTransferVisualLevelCount(editorKey) }, () => createVisualLevel())
    };
}

function normalizeVisualLevels(editorKey = 'movie', levels = []) {
    const expectedCount = getTransferVisualLevelCount(editorKey);
    return Array.from({ length: expectedCount }, (_, index) => {
        const level = Array.isArray(levels) ? levels[index] : null;
        if (level && Array.isArray(level.blocks)) {
            return {
                ...level,
                id: level.id || nextTransferVisualId('lvl'),
                blocks: level.blocks,
            };
        }
        return createVisualLevel();
    });
}

function createPathSeparatorVisualBlock() {
    return createVisualBlock({
        type: 'separator',
        raw: '/',
        label: '目录分隔符',
        display: '目录分隔符 /',
        icon: 'mdi-file-tree-outline',
        color: 'indigo',
        hue: 232,
        key: 'path_break',
    });
}

function formatTransferLiteralDisplay(value = '') {
    return String(value || '').replace(/\n/g, '↵').replace(/\t/g, '⇥');
}

function buildTransferFieldChipStyle(hue = 220) {
    const accentHue = (hue + 18) % 360;
    return {
        background: `linear-gradient(135deg, hsla(${hue}, 100%, 98%, 1) 0%, hsla(${accentHue}, 96%, 94%, 1) 100%)`,
        border: `1px solid hsla(${hue}, 72%, 52%, 0.22)`,
        color: `hsl(${hue}, 34%, 28%)`,
        fontWeight: '600',
        boxShadow: `0 1px 2px hsla(${hue}, 36%, 30%, 0.06)`,
    };
}

function buildTransferLiteralChipStyle(hue = 210) {
    const accentHue = (hue + 8) % 360;
    return {
        background: `linear-gradient(135deg, hsla(${hue}, 38%, 96%, 1) 0%, hsla(${accentHue}, 30%, 93%, 1) 100%)`,
        border: `1px solid hsla(${hue}, 22%, 42%, 0.16)`,
        color: `hsl(${hue}, 22%, 30%)`,
        fontWeight: '600',
        boxShadow: `inset 0 1px 0 hsla(${hue}, 20%, 100%, 0.42)`,
    };
}

function createVisualBlock(data = {}) {
    return {
        id: nextTransferVisualId('blk'),
        type: 'text',
        raw: '',
        label: '',
        display: '',
        icon: '',
        color: '',
        hue: null,
        key: '',
        ...data,
    };
}

function createVisualBlockFromLiteralPiece(piece = {}) {
    return createVisualBlock({
        type: piece.type === 'separator' ? 'separator' : 'text',
        raw: piece.value || '',
        label: piece.label || '',
        display: piece.display || formatTransferLiteralDisplay(piece.value || ''),
        icon: piece.icon || '',
        color: piece.color || '',
        hue: piece.hue ?? null,
        key: piece.key || '',
    });
}

function createVisualBlockFromSegment(segment = {}) {
    if (segment.type === 'field') {
        return createVisualBlock({
            type: 'field',
            raw: segment.syntax || '',
            label: segment.label || segment.key || '字段',
            display: segment.label || segment.key || '字段',
            key: segment.key || '',
        });
    }
    if (segment.type === 'expression') {
        return createVisualBlock({
            type: 'expression',
            raw: segment.syntax || '',
            label: segment.text || segment.syntax || '表达式',
            display: segment.text || segment.syntax || '表达式',
        });
    }
    return createVisualBlock({
        type: 'text',
        raw: segment.text || '',
        label: segment.text || '',
        display: formatTransferLiteralDisplay(segment.text || ''),
    });
}

function tokenizeLiteralToVisualPieces(text = '') {
    const pieces = [];
    let buffer = '';
    let cursor = 0;
    const content = String(text || '');

    const flushBuffer = () => {
        if (!buffer) return;
        pieces.push({
            type: 'text',
            value: buffer,
            display: formatTransferLiteralDisplay(buffer),
            label: buffer,
            color: 'teal',
            hue: 186,
            icon: 'mdi-code-string'
        });
        buffer = '';
    };

    while (cursor < content.length) {
        if (content[cursor] === '/') {
            flushBuffer();
            pieces.push({ type: 'path_break' });
            cursor += 1;
            continue;
        }

        let matched = null;
        for (const option of TRANSFER_LITERAL_PARSE_OPTIONS) {
            if (content.startsWith(option.value, cursor)) {
                matched = option;
                break;
            }
        }

        if (matched) {
            flushBuffer();
            pieces.push(matched);
            cursor += matched.value.length;
            continue;
        }

        buffer += content[cursor];
        cursor += 1;
    }

    flushBuffer();
    return pieces;
}

function getFixedVisualLevelIndex(editorKey = 'movie', groupIndex = 0, groupCount = 1) {
    if (editorKey === 'movie') {
        if (groupCount <= 1) return 1;
        return Math.min(groupIndex, 1);
    }
    if (editorKey === 'tv') {
        if (groupCount <= 1) return 2;
        if (groupCount === 2) {
            return groupIndex === 0 ? 0 : 2;
        }
        return Math.min(groupIndex, 2);
    }
    return Math.min(groupIndex, getTransferVisualLevelCount(editorKey) - 1);
}

function buildParsedVisualLevelsFromInspection(inspection = {}) {
    const parsedLevels = [[]];

    const getCurrentLevel = () => parsedLevels[parsedLevels.length - 1];

    (inspection.segments || []).forEach(segment => {
        if (segment.type === 'literal') {
            tokenizeLiteralToVisualPieces(segment.text || '').forEach(piece => {
                if (piece.type === 'path_break') {
                    parsedLevels.push([]);
                    return;
                }
                getCurrentLevel().push(createVisualBlockFromLiteralPiece(piece));
            });
            return;
        }
        getCurrentLevel().push(createVisualBlockFromSegment(segment));
    });

    return parsedLevels;
}

function buildVisualEditorFromInspection(inspection = {}, editorKey = 'movie') {
    const levels = createEmptyVisualEditor(editorKey).levels;
    const parsedLevels = buildParsedVisualLevelsFromInspection(inspection);

    parsedLevels.forEach((blocks, groupIndex) => {
        const targetIndex = getFixedVisualLevelIndex(editorKey, groupIndex, parsedLevels.length);
        const targetLevel = levels[targetIndex];
        if (!targetLevel || !Array.isArray(blocks)) {
            return;
        }
        if (targetLevel.blocks.length && blocks.length) {
            targetLevel.blocks.push(createPathSeparatorVisualBlock());
        }
        targetLevel.blocks.push(...blocks);
    });

    return {
        levels: normalizeVisualLevels(editorKey, levels)
    };
}

function createEmptyRenameInspection() {
    return {
        template: '',
        normalized_template: '',
        valid: true,
        error: '',
        warning: '',
        preview: '',
        segments: [],
        ordered_fields: [],
        unknown_fields: []
    };
}

function createEmptyNotifyInspection() {
    return {
        template: '',
        normalized_template: '',
        valid: true,
        error: '',
        warning: '',
        unknown_fields: [],
        movie_preview: '',
        tv_preview: '',
    };
}


function normalizeOrganizeNotifyTemplate(template = '') {
    return String(template || '').replace(/\u26A1(?!\uFE0F)/g, '\u26A1\uFE0F');
}

function normalizeNotifyInspection(inspection = {}) {
    return {
        ...createEmptyNotifyInspection(),
        ...(inspection || {}),
        template: normalizeOrganizeNotifyTemplate((inspection || {}).template || ''),
        normalized_template: normalizeOrganizeNotifyTemplate((inspection || {}).normalized_template || ''),
        movie_preview: normalizeOrganizeNotifyTemplate((inspection || {}).movie_preview || ''),
        tv_preview: normalizeOrganizeNotifyTemplate((inspection || {}).tv_preview || ''),
    };
}

function createEmptyBasicInspection() {
    return {
        movie: createEmptyRenameInspection(),
        tv: createEmptyRenameInspection(),
        organize_notify: createEmptyNotifyInspection(),
    };
}

const TRANSFER_MEDIA_PROBE_FIELD_KEYS = ['effect', 'videoFormat', 'videoCodec', 'audioCodec', 'fps', 'bitDepth'];

function normalizeTransferMediaProbeFields(fields = []) {
    const selectedSet = new Set(
        (Array.isArray(fields) ? fields : [])
            .map(field => String(field || '').trim())
            .filter(field => !!field)
    );
    return TRANSFER_MEDIA_PROBE_FIELD_KEYS.filter(field => selectedSet.has(field));
}

const CATEGORY_VISUAL_SCOPE_META = {
    movie: {
        title: '电影',
        icon: 'mdi-movie-open-outline',
        emptyText: '暂无电影分类规则，点击下方按钮新增。',
        addLabel: '新增电影分类',
    },
    tv: {
        title: '电视剧',
        icon: 'mdi-television-classic',
        emptyText: '暂无电视剧分类规则，点击下方按钮新增。',
        addLabel: '新增电视剧分类',
    }
};

const CATEGORY_SCOPE_KNOWN_RULE_KEYS = {
    movie: ['genre_ids', 'production_countries', 'original_language', 'release_year'],
    tv: ['genre_ids', 'origin_country', 'original_language', 'release_year'],
};

const CATEGORY_KNOWN_RULE_KEYS = Array.from(new Set(Object.values(CATEGORY_SCOPE_KNOWN_RULE_KEYS).flat()));

const CATEGORY_GENRE_OPTIONS = [
    { title: '动作 (28)', value: '28' },
    { title: '冒险 (12)', value: '12' },
    { title: '动画 (16)', value: '16' },
    { title: '喜剧 (35)', value: '35' },
    { title: '犯罪 (80)', value: '80' },
    { title: '纪录片 (99)', value: '99' },
    { title: '剧情 (18)', value: '18' },
    { title: '家庭 (10751)', value: '10751' },
    { title: '奇幻 (14)', value: '14' },
    { title: '历史 (36)', value: '36' },
    { title: '恐怖 (27)', value: '27' },
    { title: '音乐 (10402)', value: '10402' },
    { title: '悬疑 (9648)', value: '9648' },
    { title: '爱情 (10749)', value: '10749' },
    { title: '科幻 (878)', value: '878' },
    { title: '惊悚 (53)', value: '53' },
    { title: '战争 (10752)', value: '10752' },
    { title: '西部 (37)', value: '37' },
    { title: '儿童 (10762)', value: '10762' },
    { title: '真人秀 (10764)', value: '10764' },
    { title: '脱口秀 (10767)', value: '10767' },
];

const CATEGORY_LANGUAGE_OPTIONS = [
    { title: '中文 (zh)', value: 'zh' },
    { title: '中文 (cn)', value: 'cn' },
    { title: '英语 (en)', value: 'en' },
    { title: '日语 (ja)', value: 'ja' },
    { title: '韩语 (ko)', value: 'ko' },
    { title: '法语 (fr)', value: 'fr' },
    { title: '德语 (de)', value: 'de' },
    { title: '西班牙语 (es)', value: 'es' },
    { title: '俄语 (ru)', value: 'ru' },
    { title: '意大利语 (it)', value: 'it' },
    { title: '葡萄牙语 (pt)', value: 'pt' },
    { title: '泰语 (th)', value: 'th' },
    { title: '印地语 (hi)', value: 'hi' },
    { title: '土耳其语 (tr)', value: 'tr' },
    { title: '荷兰语 (nl)', value: 'nl' },
    { title: '阿拉伯语 (ar)', value: 'ar' },
];

const CATEGORY_COUNTRY_OPTIONS = [
    { title: '中国大陆 (CN)', value: 'CN' },
    { title: '中国香港 (HK)', value: 'HK' },
    { title: '中国台湾 (TW)', value: 'TW' },
    { title: '美国 (US)', value: 'US' },
    { title: '英国 (GB)', value: 'GB' },
    { title: '日本 (JP)', value: 'JP' },
    { title: '韩国 (KR)', value: 'KR' },
    { title: '朝鲜 (KP)', value: 'KP' },
    { title: '法国 (FR)', value: 'FR' },
    { title: '德国 (DE)', value: 'DE' },
    { title: '西班牙 (ES)', value: 'ES' },
    { title: '意大利 (IT)', value: 'IT' },
    { title: '荷兰 (NL)', value: 'NL' },
    { title: '葡萄牙 (PT)', value: 'PT' },
    { title: '俄罗斯 (RU)', value: 'RU' },
    { title: '加拿大 (CA)', value: 'CA' },
    { title: '澳大利亚 (AU)', value: 'AU' },
    { title: '新加坡 (SG)', value: 'SG' },
    { title: '泰国 (TH)', value: 'TH' },
    { title: '印度 (IN)', value: 'IN' },
];

const CATEGORY_PRESET_FIELD_DEFS = {
    movie: [
        { key: 'genre_ids', label: '类型 genre_ids', type: 'multi', items: CATEGORY_GENRE_OPTIONS, hint: '支持多值，也支持 !16 这类排除条件' },
        { key: 'production_countries', label: '国家/地区 production_countries', type: 'multi', items: CATEGORY_COUNTRY_OPTIONS, hint: '电影新规则使用这个字段，也支持 !CN 这类排除条件' },
        { key: 'original_language', label: '语种 original_language', type: 'multi', items: CATEGORY_LANGUAGE_OPTIONS, hint: '支持多值和 !en 这类排除条件' },
        { key: 'release_year', label: '年份 release_year', type: 'text', placeholder: '如 2024、2020-2024、!2023', hint: '支持单年、范围和排除' },
    ],
    tv: [
        { key: 'genre_ids', label: '类型 genre_ids', type: 'multi', items: CATEGORY_GENRE_OPTIONS, hint: '支持多值，也支持 !16 这类排除条件' },
        { key: 'origin_country', label: '国家/地区 origin_country', type: 'multi', items: CATEGORY_COUNTRY_OPTIONS, hint: '电视剧新规则使用这个字段，支持多值和排除' },
        { key: 'original_language', label: '语种 original_language', type: 'multi', items: CATEGORY_LANGUAGE_OPTIONS, hint: '支持多值和 !ja 这类排除条件' },
        { key: 'release_year', label: '年份 release_year', type: 'text', placeholder: '如 2024、2020-2024、!2023', hint: '支持单年、范围和排除' },
    ]
};

let categoryVisualSeed = 0;

function nextCategoryVisualId(prefix = 'cat') {
    categoryVisualSeed += 1;
    return `${prefix}_${categoryVisualSeed}`;
}

function getCategoryKnownRuleKeysForScope(scope = 'movie') {
    return CATEGORY_SCOPE_KNOWN_RULE_KEYS[scope] || CATEGORY_SCOPE_KNOWN_RULE_KEYS.movie;
}

function normalizeCategoryArrayValue(value) {
    const result = [];
    const source = Array.isArray(value) ? value : [value];
    source.forEach(item => {
        if (item === undefined || item === null) return;
        const rawValue = typeof item === 'object' && item.value !== undefined ? item.value : item;
        String(rawValue).split(',').forEach(part => {
            const text = String(part || '').trim();
            if (text) {
                result.push(text);
            }
        });
    });
    return result;
}

function stringifyCategoryScalarValue(value) {
    if (value === undefined || value === null) return '';
    if (Array.isArray(value)) {
        return normalizeCategoryArrayValue(value).join(',');
    }
    if (typeof value === 'object') {
        try {
            return JSON.stringify(value);
        } catch (e) {
            return String(value);
        }
    }
    return String(value).trim();
}

function createEmptyCategoryVisualRule() {
    return {
        genre_ids: [],
        original_language: [],
        origin_country: [],
        production_countries: [],
        release_year: '',
    };
}

function createCategoryVisualItem(name = '', rule = {}, scope = 'movie') {
    const sourceRule = rule && typeof rule === 'object' ? rule : {};
    const normalizedRule = createEmptyCategoryVisualRule();
    normalizedRule.genre_ids = normalizeCategoryArrayValue(sourceRule.genre_ids);
    normalizedRule.original_language = normalizeCategoryArrayValue(sourceRule.original_language);
    normalizedRule.origin_country = normalizeCategoryArrayValue(sourceRule.origin_country);
    normalizedRule.production_countries = normalizeCategoryArrayValue(sourceRule.production_countries);
    normalizedRule.release_year = stringifyCategoryScalarValue(sourceRule.release_year);
    return {
        id: nextCategoryVisualId('cat_rule'),
        scope,
        name: String(name || ''),
        rule: normalizedRule,
    };
}

function createEmptyCategoryVisualDraft() {
    return {
        movie: [],
        tv: [],
    };
}

function buildCategoryVisualDraft(data = {}) {
    const payload = data && typeof data === 'object' ? data : {};
    return {
        movie: Object.entries(payload.movie || {}).map(([name, rule]) => createCategoryVisualItem(name, rule, 'movie')),
        tv: Object.entries(payload.tv || {}).map(([name, rule]) => createCategoryVisualItem(name, rule, 'tv')),
    };
}

function buildCategoryPayloadFromDraft(draft = {}) {
    const buildScopePayload = (scope = 'movie', items = []) => {
        const result = {};
        (Array.isArray(items) ? items : []).forEach(item => {
            const categoryName = String((item && item.name) || '').trim();
            if (!categoryName) {
                return;
            }
            const rule = item && item.rule ? item.rule : {};
            const conditions = {};
            getCategoryKnownRuleKeysForScope(scope).forEach(fieldKey => {
                const value = fieldKey === 'release_year'
                    ? stringifyCategoryScalarValue(rule[fieldKey])
                    : normalizeCategoryArrayValue(rule[fieldKey]).join(',');
                if (value) {
                    conditions[fieldKey] = value;
                }
            });
            result[categoryName] = conditions;
        });
        return result;
    };
    return {
        movie: buildScopePayload('movie', draft.movie),
        tv: buildScopePayload('tv', draft.tv),
    };
}

const TransferConfigPage = {
    name: 'TransferConfigPage',
    props: {
        forcedTab: { type: String, default: '' },
        hideTabs: { type: Boolean, default: false },
    },
    data() {
        return {
            activeTab: 'basic',
            loading: false,
            saving: false,
            clearingTmdbCache: false,
            clearingOpenAiCache: false,
            basicEditorTypes: TRANSFER_BASIC_EDITOR_TYPES,
            basicConfig: {
                movie_rename_format: '',
                tv_rename_format: '',
                organize_notify_enabled: false,
                organize_notify_template: '',
                media_info_extract_trigger_fields: ['videoFormat', 'videoCodec', 'audioCodec', 'fps'],
                tmdb_cache_enabled: true,
                meta_cache_expire_hours: 24,
                gpt_cache_enabled: true,
                gpt_cache_expire_hours: 24,
            },
            savedBasicConfig: {
                movie_rename_format: '',
                tv_rename_format: '',
                organize_notify_enabled: false,
                organize_notify_template: '',
                media_info_extract_trigger_fields: ['videoFormat', 'videoCodec', 'audioCodec', 'fps'],
                tmdb_cache_enabled: true,
                meta_cache_expire_hours: 24,
                gpt_cache_enabled: true,
                gpt_cache_expire_hours: 24,
            },
            basicDefaults: {
                movie_rename_format: '',
                tv_rename_format: '',
                organize_notify_enabled: false,
                organize_notify_template: '',
                media_info_extract_trigger_fields: ['videoFormat', 'videoCodec', 'audioCodec', 'fps'],
                tmdb_cache_enabled: true,
                meta_cache_expire_hours: 24,
                gpt_cache_enabled: true,
                gpt_cache_expire_hours: 24,
            },
            basicInspection: createEmptyBasicInspection(),
            fieldCatalog: [],
            fieldStyleMap: {},
            mediaProbeFieldCatalog: [],
            notifyFieldCatalog: [],
            notifyFieldStyleMap: {},
            basicVisualEditors: {
                movie: createEmptyVisualEditor('movie'),
                tv: createEmptyVisualEditor('tv'),
            },
            literalPalette: TRANSFER_LITERAL_PALETTE,
            dragState: null,
            dragOverKey: '',
            touchDragSession: null,
            touchDragGhost: null,
            basicLoaded: false,
            basicInspectTimer: null,
            basicInspectSeq: 0,
            basicInspecting: false,
            lastSavedBasicSignature: '',
            customIdentifiers: '',
            customCaptures: '',
            customReleaseGroups: '',
            postRenderWords: '',
            identifiersValidation: { valid: true, errors: [] },
            releaseGroupsValidation: { valid: true, errors: [] },
            capturesValidation: { valid: true, errors: [] },
            postRenderWordsValidation: { valid: true, errors: [] },
            identifiersValidateTimer: null,
            releaseGroupsValidateTimer: null,
            capturesValidateTimer: null,
            postRenderWordsValidateTimer: null,
            categoryRaw: '',
            savedCategoryRaw: '',
            categorySaving: false,
            categoryAceEditor: null,
            categoryDefaultRaw: '',
            categoryScopeMeta: CATEGORY_VISUAL_SCOPE_META,
            categoryPresetFields: CATEGORY_PRESET_FIELD_DEFS,
            categoryEditorDialog: false,
            categoryEditorLoading: false,
            categoryEditorSaving: false,
            categoryVisualDraft: createEmptyCategoryVisualDraft(),
            organizeNotifyPreviewDialog: false,
            organizeNotifyFieldDialog: false,
        };
    },
    async mounted() {
        if (this.forcedTab) {
            this.activeTab = this.forcedTab;
        } else {
            const hash = window.location.hash.replace(/^#\/?/, '');
            const parts = hash.split('/');
            if (parts[0] === 'transfer_config' && parts[1]) {
                const validTabs = ['basic', 'identifiers', 'captures', 'release_groups', 'post_render_words', 'category'];
                if (validTabs.includes(parts[1])) {
                    this.activeTab = parts[1];
                }
            }
        }
        if (typeof document !== 'undefined' && !document.getElementById('transfer-touch-drag-css')) {
            const s = document.createElement('style');
            s.id = 'transfer-touch-drag-css';
            s.textContent = '[data-transfer-drop-zone][data-drop-active]{width:6px!important;min-width:6px!important;background:rgba(96,125,213,.72)!important;opacity:1!important;transition:none!important}';
            document.head.appendChild(s);
        }
        await this.loadAll();
    },
    beforeUnmount() {
        this.detachTouchDragListeners();
        this.destroyCategoryAceEditor();
        if (this.basicInspectTimer) {
            clearTimeout(this.basicInspectTimer);
            this.basicInspectTimer = null;
        }
        if (this.identifiersValidateTimer) { clearTimeout(this.identifiersValidateTimer); this.identifiersValidateTimer = null; }
        if (this.releaseGroupsValidateTimer) { clearTimeout(this.releaseGroupsValidateTimer); this.releaseGroupsValidateTimer = null; }
        if (this.capturesValidateTimer) { clearTimeout(this.capturesValidateTimer); this.capturesValidateTimer = null; }
        if (this.postRenderWordsValidateTimer) { clearTimeout(this.postRenderWordsValidateTimer); this.postRenderWordsValidateTimer = null; }
    },
    watch: {
        customIdentifiers() { this.scheduleRuleValidation('identifiers'); },
        customReleaseGroups() { this.scheduleRuleValidation('release_groups'); },
        customCaptures() { this.scheduleRuleValidation('captures'); },
        postRenderWords() { this.scheduleRuleValidation('post_render_words'); },
        activeTab(val, oldVal) {
            if (!this.hideTabs) {
                const base = 'transfer_config';
                if (val === 'basic') {
                    router.push(base);
                } else {
                    router.push(base + '/' + val);
                }
            }
            if (val === 'category') {
                this.initCategoryAceEditor();
            }
            if (oldVal === 'category') {
                this.destroyCategoryAceEditor();
            }
        }
    },
    methods: {
        async loadAll() {
            this.loading = true;
            try {
                const [basicRes, idRes, phRes, rgRes, prRes, catRes, catDefaultRes] = await Promise.all([
                    api.request('/transfer_config/basic'),
                    api.request('/transfer_config/custom_identifiers'),
                    api.request('/transfer_config/custom_captures'),
                    api.request('/transfer_config/custom_release_groups'),
                    api.request('/transfer_config/post_render_words'),
                    api.request('/transfer_config/category/raw'),
                    api.request('/transfer_config/category/default_raw'),
                ]);
                if (basicRes.success) {
                    this.applyBasicResponse(basicRes, { markSaved: true });
                }
                if (idRes.success) this.customIdentifiers = (idRes.data || []).join('\n');
                if (phRes.success) this.customCaptures = (phRes.data || []).join('\n');
                if (rgRes.success) this.customReleaseGroups = (rgRes.data || []).join('\n');
                if (prRes.success) this.postRenderWords = (prRes.data || []).join('\n');
                if (catRes.success) {
                    this.categoryRaw = catRes.data || '';
                    this.savedCategoryRaw = this.categoryRaw;
                }
                if (catDefaultRes && catDefaultRes.success) {
                    this.categoryDefaultRaw = catDefaultRes.data || '';
                }
            } catch (e) {
                window.showMessage && window.showMessage('加载配置失败: ' + (e.message || ''), 'error');
            } finally {
                this.basicLoaded = true;
                this.loading = false;
                if (this.activeTab === 'category') {
                    if (this.categoryAceEditor) {
                        this.syncCategoryAceEditor();
                    } else {
                        this.initCategoryAceEditor();
                    }
                }
                this.validateRuleNow('identifiers');
                this.validateRuleNow('release_groups');
                this.validateRuleNow('captures');
                this.validateRuleNow('post_render_words');
            }
        },
        normalizeBasicInspection(inspection = {}) {
            return {
                movie: { ...createEmptyRenameInspection(), ...(inspection.movie || {}) },
                tv: { ...createEmptyRenameInspection(), ...(inspection.tv || {}) },
                organize_notify: normalizeNotifyInspection(inspection.organize_notify),
            };
        },
        setFieldCatalog(fieldCatalog = []) {
            this.fieldCatalog = Array.isArray(fieldCatalog) ? fieldCatalog : [];
            const fieldStyleMap = {};
            let fieldIndex = 0;
            this.fieldCatalog.forEach(section => {
                (section.items || []).forEach(item => {
                    fieldStyleMap[item.key] = buildTransferFieldChipStyle((fieldIndex * 41 + 16) % 360);
                    fieldIndex += 1;
                });
            });
            this.fieldStyleMap = fieldStyleMap;
        },
        setNotifyFieldCatalog(fieldCatalog = []) {
            this.notifyFieldCatalog = Array.isArray(fieldCatalog) ? fieldCatalog : [];
            const fieldStyleMap = {};
            let fieldIndex = 0;
            this.notifyFieldCatalog.forEach(section => {
                (section.items || []).forEach(item => {
                    fieldStyleMap[item.key] = buildTransferFieldChipStyle((fieldIndex * 37 + 42) % 360);
                    fieldIndex += 1;
                });
            });
            this.notifyFieldStyleMap = fieldStyleMap;
        },
        setMediaProbeFieldCatalog(fieldCatalog = []) {
            this.mediaProbeFieldCatalog = Array.isArray(fieldCatalog) ? fieldCatalog : [];
        },
        getFieldChipStyle(field = {}) {
            if (field && field.key && this.fieldStyleMap[field.key]) {
                return this.fieldStyleMap[field.key];
            }
            const fieldKey = String((field && (field.key || field.label)) || 'field');
            let seed = 0;
            for (let index = 0; index < fieldKey.length; index += 1) {
                seed = (seed + (fieldKey.charCodeAt(index) * (index + 7))) % 360;
            }
            return buildTransferFieldChipStyle(seed);
        },
        getNotifyFieldChipStyle(field = {}) {
            if (field && field.key && this.notifyFieldStyleMap[field.key]) {
                return this.notifyFieldStyleMap[field.key];
            }
            return this.getFieldChipStyle(field);
        },
        applyBasicResponse(result, { markSaved = false } = {}) {
            if (result.defaults) {
                const nextDefaults = { ...this.basicDefaults, ...result.defaults };
                nextDefaults.organize_notify_template = normalizeOrganizeNotifyTemplate(nextDefaults.organize_notify_template || '');
                nextDefaults.media_info_extract_trigger_fields = normalizeTransferMediaProbeFields(nextDefaults.media_info_extract_trigger_fields || []);
                this.basicDefaults = nextDefaults;
            }
            if (Array.isArray(result.field_catalog)) {
                this.setFieldCatalog(result.field_catalog);
            }
            if (Array.isArray(result.media_probe_field_catalog)) {
                this.setMediaProbeFieldCatalog(result.media_probe_field_catalog);
            }
            if (Array.isArray(result.notify_field_catalog)) {
                this.setNotifyFieldCatalog(result.notify_field_catalog);
            }
            const mergedBasicConfig = result.data ? { ...this.basicConfig, ...result.data } : { ...this.basicConfig };
            mergedBasicConfig.organize_notify_template = normalizeOrganizeNotifyTemplate(mergedBasicConfig.organize_notify_template || '');
            mergedBasicConfig.media_info_extract_trigger_fields = normalizeTransferMediaProbeFields(mergedBasicConfig.media_info_extract_trigger_fields || []);
            this.basicConfig = mergedBasicConfig;
            this.basicInspection = this.normalizeBasicInspection(result.inspection);
            this.syncVisualEditorsFromInspection();
            if (markSaved) {
                this.savedBasicConfig = {
                    ...mergedBasicConfig,
                    media_info_extract_trigger_fields: [...mergedBasicConfig.media_info_extract_trigger_fields]
                };
                this.lastSavedBasicSignature = this.getBasicConfigSignature(mergedBasicConfig);
            }
        },
        getBasicConfigSignature(config = this.basicConfig) {
            return JSON.stringify({
                movie_rename_format: config.movie_rename_format || '',
                tv_rename_format: config.tv_rename_format || '',
                organize_notify_enabled: !!config.organize_notify_enabled,
                organize_notify_template: config.organize_notify_template || '',
                media_info_extract_trigger_fields: normalizeTransferMediaProbeFields(config.media_info_extract_trigger_fields || []),
                tmdb_cache_enabled: !!config.tmdb_cache_enabled,
                meta_cache_expire_hours: config.meta_cache_expire_hours,
                gpt_cache_enabled: !!config.gpt_cache_enabled,
                gpt_cache_expire_hours: config.gpt_cache_expire_hours,
            });
        },
        getEditorInspection(editor) {
            return this.basicInspection[editor.key] || createEmptyRenameInspection();
        },
        getOrganizeNotifyInspection() {
            return this.basicInspection.organize_notify || createEmptyNotifyInspection();
        },
        getNotifyFieldCount() {
            return (this.notifyFieldCatalog || []).reduce((count, section) => count + ((section.items || []).length), 0);
        },
        getMediaProbeFieldItems() {
            return (this.mediaProbeFieldCatalog || []).reduce((items, section) => {
                (section.items || []).forEach(item => {
                    items.push(item);
                });
                return items;
            }, []);
        },
        toggleMediaProbeField(fieldKey) {
            if (this.loading || this.saving) {
                return;
            }
            const selectedSet = new Set(normalizeTransferMediaProbeFields(this.basicConfig.media_info_extract_trigger_fields || []));
            if (selectedSet.has(fieldKey)) {
                selectedSet.delete(fieldKey);
            } else {
                selectedSet.add(fieldKey);
            }
            this.basicConfig.media_info_extract_trigger_fields = normalizeTransferMediaProbeFields(Array.from(selectedSet));
        },
        getMediaProbeFieldChipStyle(item = {}) {
            const selected = (this.basicConfig.media_info_extract_trigger_fields || []).includes(item.key);
            if (selected) {
                return {
                    ...this.getFieldChipStyle(item),
                    border: '1px solid rgba(var(--v-theme-primary),0.38)',
                    fontWeight: '700',
                    boxShadow: '0 0 0 1px rgba(var(--v-theme-primary),0.08) inset, 0 4px 10px rgba(var(--v-theme-primary),0.08)',
                };
            }
            return {
                background: 'rgba(var(--v-theme-on-surface),0.04)',
                border: '1px solid rgba(var(--v-theme-on-surface),0.14)',
                color: 'rgba(var(--v-theme-on-surface),0.78)',
                fontWeight: '500',
                boxShadow: 'none',
            };
        },
        getNotifyFieldCardStyle(item = {}) {
            return {
                ...this.getNotifyFieldChipStyle(item),
                borderRadius: '10px',
                fontFamily: 'monospace',
                fontSize: '12px',
                width: 'fit-content'
            };
        },
        getFilteredFieldCatalog(editorKey) {
            return (this.fieldCatalog || []).reduce((items, section) => {
                (section.items || []).forEach(item => {
                    if ((item.scopes || []).includes(editorKey)) {
                        items.push(item);
                    }
                });
                return items;
            }, []);
        },
        getPaletteChipStyle(item = {}) {
            const baseStyle = {
                borderRadius: '10px',
                minHeight: '28px',
                fontSize: '12px',
                lineHeight: '1.1',
                boxShadow: 'none',
                cursor: 'grab',
                maxWidth: '100%',
            };
            if (item.snippet) {
                return {
                    ...this.getFieldChipStyle(item),
                    ...baseStyle,
                };
            }
            const literalHue = item.hue ?? (item.type === 'separator' ? 210 : 186);
            if (item.type === 'separator') {
                return {
                    ...buildTransferLiteralChipStyle(literalHue),
                    ...baseStyle,
                    fontFamily: 'monospace',
                    minWidth: item.key === 'space' ? '34px' : '28px',
                    justifyContent: 'center',
                    whiteSpace: 'pre',
                };
            }
            return {
                ...buildTransferLiteralChipStyle(literalHue),
                ...baseStyle,
                fontFamily: 'monospace',
                whiteSpace: 'pre',
            };
        },
        getVisualBlockChipStyle(block = {}) {
            const baseStyle = {
                borderRadius: '10px',
                minHeight: '28px',
                fontSize: '12px',
                lineHeight: '1.1',
                boxShadow: 'none',
                maxWidth: '100%',
            };
            if (block.type === 'field') {
                return {
                    ...this.getFieldChipStyle(block),
                    ...baseStyle,
                };
            }
            const literalHue = block.hue ?? (block.type === 'separator' ? 210 : 186);
            if (block.type === 'separator') {
                return {
                    ...buildTransferLiteralChipStyle(literalHue),
                    ...baseStyle,
                    fontFamily: 'monospace',
                    minWidth: block.raw === ' ' ? '34px' : '28px',
                    justifyContent: 'center',
                    whiteSpace: 'pre',
                };
            }
            if (block.type === 'expression') {
                return {
                    ...buildTransferLiteralChipStyle(268),
                    ...baseStyle,
                };
            }
            return {
                ...buildTransferLiteralChipStyle(literalHue),
                ...baseStyle,
                fontFamily: 'monospace',
            };
        },
        getPaletteItemText(item = {}) {
            if (item.snippet) {
                return item.label || item.key || '字段';
            }
            return item.display || formatTransferLiteralDisplay(item.value || item.raw || item.label || '');
        },
        getTouchDragPreviewText(item = {}) {
            if (item && item.raw !== undefined && !item.snippet) {
                return this.getVisualBlockText(item);
            }
            return this.getPaletteItemText(item);
        },
        getTouchDragPreviewStyle(item = {}) {
            if (item && item.raw !== undefined && !item.snippet) {
                return this.getVisualBlockChipStyle(item);
            }
            return this.getPaletteChipStyle(item);
        },
        syncVisualEditorsFromInspection() {
            this.basicEditorTypes.forEach(editor => {
                this.basicVisualEditors[editor.key] = buildVisualEditorFromInspection(this.basicInspection[editor.key] || createEmptyRenameInspection(), editor.key);
            });
        },
        getVisualEditorState(editorKey) {
            if (!this.basicVisualEditors[editorKey]) {
                this.basicVisualEditors[editorKey] = createEmptyVisualEditor(editorKey);
            }
            if (!Array.isArray(this.basicVisualEditors[editorKey].levels) || !this.basicVisualEditors[editorKey].levels.length) {
                this.basicVisualEditors[editorKey] = createEmptyVisualEditor(editorKey);
            }
            return this.basicVisualEditors[editorKey];
        },
        getVisualLevels(editorKey) {
            return this.getVisualEditorState(editorKey).levels || [];
        },
        isBasicDirty() {
            return this.getBasicConfigSignature() !== this.lastSavedBasicSignature;
        },
        isEditorDirty(editor) {
            return (this.basicConfig[editor.configKey] || '') !== (this.savedBasicConfig[editor.configKey] || '');
        },
        getEditorLevelLabel(editorKey, levelIndex) {
            const levels = this.getVisualLevels(editorKey);
            return levelIndex === levels.length - 1 ? '文件名层' : `目录层 ${levelIndex + 1}`;
        },
        getVisualBlockIcon(block = {}) {
            if (block.icon) return block.icon;
            if (block.type === 'field') return 'mdi-variable';
            if (block.type === 'expression') return 'mdi-function-variant';
            if (block.type === 'separator') return 'mdi-minus';
            return 'mdi-format-letter-case';
        },
        getVisualBlockColor(block = {}) {
            if (block.color) return block.color;
            if (block.type === 'field') return 'primary';
            if (block.type === 'expression') return 'deep-purple';
            if (block.type === 'separator') return 'blue-grey';
            return 'teal';
        },
        getVisualBlockText(block = {}) {
            if (block.display) return block.display;
            if (block.label) return block.label;
            return formatTransferLiteralDisplay(block.raw || '');
        },
        getVisualDropZoneKey(editorKey, levelIndex, blockIndex) {
            return `${editorKey}:${levelIndex}:${blockIndex}`;
        },
        isDropZoneActive(editorKey, levelIndex, blockIndex) {
            return this.dragOverKey === this.getVisualDropZoneKey(editorKey, levelIndex, blockIndex);
        },
        getDropZoneStyle(editorKey, levelIndex, blockIndex, isWide = false) {
            const active = this.isDropZoneActive(editorKey, levelIndex, blockIndex);
            const dragging = !!this.dragState || !!(this.touchDragSession && this.touchDragSession.active);
            if (isWide) {
                return {
                    width: '100%',
                    minWidth: '100%',
                    minHeight: '34px',
                    borderRadius: '10px',
                    border: active ? '1px solid rgba(var(--v-theme-primary),0.26)' : '1px solid rgba(var(--v-theme-on-surface),0.08)',
                    background: active ? 'rgba(var(--v-theme-primary),0.10)' : 'rgba(var(--v-theme-on-surface),0.025)',
                    transition: 'all 0.15s ease'
                };
            }
            return {
                width: active ? '6px' : (dragging ? '4px' : '2px'),
                minWidth: active ? '6px' : (dragging ? '4px' : '2px'),
                minHeight: '24px',
                borderRadius: '999px',
                border: 'none',
                background: active ? 'rgba(var(--v-theme-primary),0.72)' : 'rgba(var(--v-theme-primary),0.08)',
                opacity: active ? 1 : (dragging ? 0.45 : 0.18),
                transition: 'all 0.15s ease'
            };
        },
        resolvePointerClientX(event) {
            const touch = (event && event.changedTouches && event.changedTouches[0])
                || (event && event.touches && event.touches[0])
                || null;
            if (touch) return touch.clientX;
            return typeof (event || {}).clientX === 'number' ? event.clientX : null;
        },
        resolveDropIndexForBlock(blockIndex, event, currentTarget = null, pointerClientX = null) {
            const target = currentTarget || (event && event.currentTarget) || null;
            const clientX = pointerClientX !== null ? pointerClientX : this.resolvePointerClientX(event);
            if (!target || clientX === null) {
                return blockIndex + 1;
            }
            const rect = target.getBoundingClientRect();
            return clientX < rect.left + (rect.width / 2) ? blockIndex : blockIndex + 1;
        },
        resolveLevelDropIndex(editorKey, levelIndex, event) {
            const level = this.getVisualLevels(editorKey)[levelIndex];
            if (!level || !Array.isArray(level.blocks) || !level.blocks.length) {
                return 0;
            }
            const blockWrapper = event && event.target && event.target.closest
                ? event.target.closest('[data-transfer-block-wrapper]')
                : null;
            if (blockWrapper && blockWrapper.dataset) {
                const blockIndex = Number(blockWrapper.dataset.transferBlockIndex);
                if (!Number.isNaN(blockIndex)) {
                    return this.resolveDropIndexForBlock(blockIndex, event, blockWrapper);
                }
            }
            return level.blocks.length;
        },
        handleLevelDragOver(editorKey, levelIndex, event) {
            if (event) {
                event.preventDefault();
            }
            const now = Date.now();
            if (this._lastDragOverTs && now - this._lastDragOverTs < 30) return;
            this._lastDragOverTs = now;
            this.handleDropZoneEnter(editorKey, levelIndex, this.resolveLevelDropIndex(editorKey, levelIndex, event));
        },
        handleLevelDrop(editorKey, levelIndex, event) {
            this.handleDropOnZone(editorKey, levelIndex, this.resolveLevelDropIndex(editorKey, levelIndex, event), event);
        },
        handleBlockDragOver(editorKey, levelIndex, blockIndex, event) {
            if (event) {
                event.preventDefault();
            }
            const now = Date.now();
            if (this._lastDragOverTs && now - this._lastDragOverTs < 30) return;
            this._lastDragOverTs = now;
            this.handleDropZoneEnter(editorKey, levelIndex, this.resolveDropIndexForBlock(blockIndex, event));
        },
        handleBlockDrop(editorKey, levelIndex, blockIndex, event) {
            this.handleDropOnZone(editorKey, levelIndex, this.resolveDropIndexForBlock(blockIndex, event), event);
        },
        setBasicTemplate(editor, value) {
            this.basicConfig[editor.configKey] = value;
            this.scheduleBasicInspect();
        },
        setOrganizeNotifyTemplate(value) {
            this.basicConfig.organize_notify_template = normalizeOrganizeNotifyTemplate(value);
            this.scheduleBasicInspect();
        },
        createFieldVisualBlock(item = {}) {
            return createVisualBlock({
                type: 'field',
                raw: item.snippet || '',
                label: item.label || item.key || '字段',
                display: item.label || item.key || '字段',
                key: item.key || '',
                icon: 'mdi-variable',
                color: 'primary',
            });
        },
        createLiteralVisualBlock(item = {}) {
            return createVisualBlock({
                type: item.type === 'separator' ? 'separator' : 'text',
                raw: item.value || '',
                label: item.label || '',
                display: item.display || formatTransferLiteralDisplay(item.value || ''),
                key: item.key || '',
                icon: item.icon || '',
                color: item.color || '',
                hue: item.hue ?? null,
            });
        },
        appendFieldBlock(editorKey, item) {
            const levels = this.getVisualLevels(editorKey);
            levels[levels.length - 1].blocks.push(this.createFieldVisualBlock(item));
            this.syncTemplateFromVisual(editorKey, { immediate: true });
        },
        appendLiteralBlock(editorKey, item) {
            const levels = this.getVisualLevels(editorKey);
            levels[levels.length - 1].blocks.push(this.createLiteralVisualBlock(item));
            this.syncTemplateFromVisual(editorKey, { immediate: true });
        },
        getTouchDragGhostWrapperStyle() {
            return {
                position: 'fixed',
                left: `${this.touchDragGhost?.x || 0}px`,
                top: `${this.touchDragGhost?.y || 0}px`,
                transform: 'translate(-50%, calc(-100% - 10px))',
                pointerEvents: 'none',
                zIndex: 9999,
                opacity: 0.98,
            };
        },
        clearVisualTemplate(editorKey) {
            this.basicVisualEditors[editorKey] = createEmptyVisualEditor(editorKey);
            this.syncTemplateFromVisual(editorKey, { immediate: true });
        },
        removeVisualBlock(editorKey, levelIndex, blockIndex) {
            const level = this.getVisualLevels(editorKey)[levelIndex];
            if (!level) return;
            level.blocks.splice(blockIndex, 1);
            this.syncTemplateFromVisual(editorKey, { immediate: true });
        },
        compileVisualTemplate(editorKey) {
            return this.getVisualLevels(editorKey)
                .map(level => (level.blocks || []).map(block => block.raw || '').join(''))
                .filter(levelValue => levelValue !== '')
                .join('/');
        },
        syncTemplateFromVisual(editorKey, { inspect = true, immediate = false } = {}) {
            const editor = this.basicEditorTypes.find(item => item.key === editorKey);
            if (!editor) return;
            this.basicConfig[editor.configKey] = this.compileVisualTemplate(editorKey);
            if (inspect) {
                this.scheduleBasicInspect(immediate);
            }
        },
        queueTouchPaletteDrag(editorKey, item, event) {
            const touch = event && event.touches && event.touches[0];
            if (!touch) return;
            this.handleDragEnd();
            this.clearTouchDragSession();
            this.touchDragSession = {
                active: false,
                startX: touch.clientX,
                startY: touch.clientY,
                previewItem: { ...item },
                dragState: {
                    source: 'palette',
                    editorKey,
                    item: { ...item }
                }
            };
            this.attachTouchDragListeners();
        },
        queueTouchBlockDrag(editorKey, levelIndex, blockIndex, event) {
            const touch = event && event.touches && event.touches[0];
            const block = this.getVisualLevels(editorKey)[levelIndex]?.blocks?.[blockIndex];
            if (!touch || !block) return;
            this.handleDragEnd();
            this.clearTouchDragSession();
            this.touchDragSession = {
                active: false,
                startX: touch.clientX,
                startY: touch.clientY,
                previewItem: { ...block },
                dragState: {
                    source: 'block',
                    editorKey,
                    levelIndex,
                    blockIndex,
                }
            };
            this.attachTouchDragListeners();
        },
        attachTouchDragListeners() {
            if (this.touchDragMoveHandler || typeof document === 'undefined') return;
            this.touchDragMoveHandler = this.handleTouchDragMove.bind(this);
            this.touchDragEndHandler = this.handleTouchDragEnd.bind(this);
            document.addEventListener('touchmove', this.touchDragMoveHandler, { passive: false });
            document.addEventListener('touchend', this.touchDragEndHandler, { passive: false });
            document.addEventListener('touchcancel', this.touchDragEndHandler, { passive: false });
        },
        detachTouchDragListeners() {
            if (!this.touchDragMoveHandler || typeof document === 'undefined') return;
            document.removeEventListener('touchmove', this.touchDragMoveHandler);
            document.removeEventListener('touchend', this.touchDragEndHandler);
            document.removeEventListener('touchcancel', this.touchDragEndHandler);
            this.touchDragMoveHandler = null;
            this.touchDragEndHandler = null;
        },
        clearTouchDragSession() {
            this.touchDragSession = null;
            this.touchDragGhost = null;
            this._removeTouchGhostEl();
            this._clearDropZoneHighlight();
            this._touchResolvedZone = null;
            this._touchDragRafPending = false;
            this.detachTouchDragListeners();
        },
        _createTouchGhostEl(text, chipStyle) {
            this._removeTouchGhostEl();
            const ghost = document.createElement('div');
            ghost.id = 'transfer-touch-ghost-el';
            ghost.style.cssText = 'position:fixed;pointer-events:none;z-index:9999;opacity:0.98;transform:translate(-50%,calc(-100% - 10px));will-change:left,top;';
            const chip = document.createElement('span');
            const base = 'display:inline-flex;align-items:center;padding:0 10px;height:28px;border-radius:10px;font-size:12px;line-height:1.1;white-space:nowrap;';
            const extra = chipStyle ? Object.entries(chipStyle).map(([k,v]) => {
                const prop = k.replace(/[A-Z]/g, m => '-' + m.toLowerCase());
                return prop + ':' + v;
            }).join(';') : '';
            chip.style.cssText = base + extra;
            chip.textContent = text || '';
            ghost.appendChild(chip);
            document.body.appendChild(ghost);
            this._touchGhostEl = ghost;
        },
        _moveTouchGhostEl(x, y) {
            if (this._touchGhostEl) {
                this._touchGhostEl.style.left = x + 'px';
                this._touchGhostEl.style.top = y + 'px';
            }
        },
        _removeTouchGhostEl() {
            if (this._touchGhostEl) {
                this._touchGhostEl.remove();
                this._touchGhostEl = null;
            }
        },
        _highlightDropZone(zone) {
            const newKey = zone ? zone.key : '';
            if (this._activeDropZoneKey === newKey) return;
            this._clearDropZoneHighlight();
            this._activeDropZoneKey = newKey;
            if (newKey) {
                const el = document.querySelector('[data-transfer-drop-zone="' + newKey + '"]');
                if (el) {
                    el.setAttribute('data-drop-active', '1');
                    this._activeDropZoneEl = el;
                }
            }
        },
        _clearDropZoneHighlight() {
            if (this._activeDropZoneEl) {
                this._activeDropZoneEl.removeAttribute('data-drop-active');
                this._activeDropZoneEl = null;
            }
            this._activeDropZoneKey = '';
        },
        resolveDropZoneFromPoint(clientX, clientY) {
            if (typeof document === 'undefined') return null;
            const element = document.elementFromPoint(clientX, clientY);
            const zone = element && element.closest ? element.closest('[data-transfer-drop-zone]') : null;
            const zoneKey = zone && zone.dataset ? zone.dataset.transferDropZone : '';
            if (zoneKey) {
                const [editorKey, levelIndex, blockIndex] = zoneKey.split(':');
                return {
                    key: zoneKey,
                    editorKey,
                    levelIndex: Number(levelIndex),
                    blockIndex: Number(blockIndex),
                };
            }
            const blockWrapper = element && element.closest ? element.closest('[data-transfer-block-wrapper]') : null;
            if (blockWrapper && blockWrapper.dataset) {
                const editorKey = blockWrapper.dataset.transferBlockEditor || '';
                const levelIndex = Number(blockWrapper.dataset.transferLevelIndex);
                const blockIndex = Number(blockWrapper.dataset.transferBlockIndex);
                if (editorKey && !Number.isNaN(levelIndex) && !Number.isNaN(blockIndex)) {
                    const resolvedIndex = this.resolveDropIndexForBlock(blockIndex, null, blockWrapper, clientX);
                    return {
                        key: this.getVisualDropZoneKey(editorKey, levelIndex, resolvedIndex),
                        editorKey,
                        levelIndex,
                        blockIndex: resolvedIndex,
                    };
                }
            }
            const levelZone = element && element.closest ? element.closest('[data-transfer-level-zone]') : null;
            if (levelZone && levelZone.dataset) {
                const editorKey = levelZone.dataset.transferLevelEditor || '';
                const levelIndex = Number(levelZone.dataset.transferLevelIndex);
                const blockCount = Number(levelZone.dataset.transferBlockCount || 0);
                if (editorKey && !Number.isNaN(levelIndex)) {
                    return {
                        key: this.getVisualDropZoneKey(editorKey, levelIndex, blockCount),
                        editorKey,
                        levelIndex,
                        blockIndex: blockCount,
                    };
                }
            }
            return null;
        },
        handleTouchDragMove(event) {
            if (!this.touchDragSession) return;
            const touch = event && event.touches && event.touches[0];
            if (!touch) return;
            const session = this.touchDragSession;
            const deltaX = touch.clientX - session.startX;
            const deltaY = touch.clientY - session.startY;
            if (!session.active && Math.abs(deltaX) + Math.abs(deltaY) < 8) {
                return;
            }
            if (!session.active) {
                this.dragState = { ...session.dragState };
                this.touchDragSession = { ...session, active: true };
                const previewText = this.getTouchDragPreviewText(session.previewItem);
                const previewStyle = this.getTouchDragPreviewStyle(session.previewItem);
                this._createTouchGhostEl(previewText, previewStyle);
            }
            event.preventDefault();
            this._lastTouchClientX = touch.clientX;
            this._lastTouchClientY = touch.clientY;
            if (this._touchDragRafPending) return;
            this._touchDragRafPending = true;
            requestAnimationFrame(() => {
                this._touchDragRafPending = false;
                if (!this.touchDragSession) return;
                const cx = this._lastTouchClientX;
                const cy = this._lastTouchClientY;
                this._moveTouchGhostEl(cx, cy);
                const zone = this.resolveDropZoneFromPoint(cx, cy);
                this._highlightDropZone(zone);
                this._touchResolvedZone = zone;
            });
        },
        handleTouchDragEnd(event) {
            if (!this.touchDragSession) return;
            const session = this.touchDragSession;
            if (!session.active) {
                this.clearTouchDragSession();
                return;
            }
            const touch = (event && event.changedTouches && event.changedTouches[0]) || null;
            const zone = touch
                ? this.resolveDropZoneFromPoint(touch.clientX, touch.clientY)
                : this._touchResolvedZone;
            if (zone) {
                this._removeTouchGhostEl();
                this._clearDropZoneHighlight();
                this.handleDropOnZone(zone.editorKey, zone.levelIndex, zone.blockIndex);
                this.clearTouchDragSession();
                return;
            }
            this.handleDragEnd();
            this.clearTouchDragSession();
        },
        handlePaletteDragStart(editorKey, item, event) {
            this.dragState = {
                source: 'palette',
                editorKey,
                item: { ...item }
            };
            this.dragOverKey = '';
            if (event && event.dataTransfer) {
                event.dataTransfer.effectAllowed = 'copy';
                event.dataTransfer.setData('text/plain', item.key || item.label || 'palette');
            }
        },
        handleBlockDragStart(editorKey, levelIndex, blockIndex, event) {
            const block = this.getVisualLevels(editorKey)[levelIndex]?.blocks?.[blockIndex];
            if (!block) return;
            this.dragState = {
                source: 'block',
                editorKey,
                levelIndex,
                blockIndex,
            };
            this.dragOverKey = '';
            if (event && event.dataTransfer) {
                event.dataTransfer.effectAllowed = 'move';
                event.dataTransfer.setData('text/plain', block.raw || block.label || 'block');
            }
        },
        handleDragEnd() {
            this.dragState = null;
            this.dragOverKey = '';
            this.touchDragGhost = null;
            this._removeTouchGhostEl();
            this._clearDropZoneHighlight();
        },
        handleDropZoneEnter(editorKey, levelIndex, blockIndex) {
            const key = this.getVisualDropZoneKey(editorKey, levelIndex, blockIndex);
            if (this.dragOverKey === key) return;
            this.dragOverKey = key;
        },
        insertBlockAt(editorKey, levelIndex, blockIndex, block) {
            const levels = this.getVisualLevels(editorKey);
            if (!levels[levelIndex]) {
                levels.push(createVisualLevel());
            }
            levels[levelIndex].blocks.splice(blockIndex, 0, block);
        },
        extractDraggedBlock() {
            if (!this.dragState || this.dragState.source !== 'block') return null;
            const sourceLevels = this.getVisualLevels(this.dragState.editorKey);
            const sourceLevel = sourceLevels[this.dragState.levelIndex];
            if (!sourceLevel || !sourceLevel.blocks[this.dragState.blockIndex]) return null;
            return sourceLevel.blocks.splice(this.dragState.blockIndex, 1)[0];
        },
        handleDropOnZone(editorKey, levelIndex, blockIndex, event) {
            if (event) {
                event.preventDefault();
            }
            if (!this.dragState) return;

            const dragState = { ...this.dragState };
            this.dragOverKey = '';

            if (dragState.source === 'palette') {
                this.insertBlockAt(editorKey, levelIndex, blockIndex, this.createLiteralVisualBlock(dragState.item.type ? dragState.item : { ...dragState.item, type: 'text' }));
                if (dragState.item.snippet) {
                    const level = this.getVisualLevels(editorKey)[levelIndex];
                    level.blocks.splice(blockIndex, 1, this.createFieldVisualBlock(dragState.item));
                }
                this.syncTemplateFromVisual(editorKey, { immediate: true });
                this.handleDragEnd();
                return;
            }

            const sourceEditorKey = dragState.editorKey;
            let insertIndex = blockIndex;
            if (dragState.editorKey === editorKey && dragState.levelIndex === levelIndex && dragState.blockIndex < insertIndex) {
                insertIndex -= 1;
            }
            const block = this.extractDraggedBlock();
            if (!block) {
                this.handleDragEnd();
                return;
            }
            this.insertBlockAt(editorKey, levelIndex, insertIndex, block);
            this.syncTemplateFromVisual(editorKey, { immediate: true });
            if (sourceEditorKey !== editorKey) {
                this.syncTemplateFromVisual(sourceEditorKey, { immediate: true });
            }
            this.handleDragEnd();
        },
        textToArray(text) {
            if (!text || !text.trim()) return [];
            return text.split('\n');
        },
        scheduleRuleValidation(kind) {
            const timerKey = kind === 'release_groups' ? 'releaseGroupsValidateTimer' : kind === 'captures' ? 'capturesValidateTimer' : kind === 'post_render_words' ? 'postRenderWordsValidateTimer' : 'identifiersValidateTimer';
            if (this[timerKey]) { clearTimeout(this[timerKey]); this[timerKey] = null; }
            this[timerKey] = setTimeout(() => { this.validateRuleNow(kind); }, 350);
        },
        async validateRuleNow(kind) {
            const timerKey = kind === 'release_groups' ? 'releaseGroupsValidateTimer' : kind === 'captures' ? 'capturesValidateTimer' : kind === 'post_render_words' ? 'postRenderWordsValidateTimer' : 'identifiersValidateTimer';
            const stateKey = kind === 'release_groups' ? 'releaseGroupsValidation' : kind === 'captures' ? 'capturesValidation' : kind === 'post_render_words' ? 'postRenderWordsValidation' : 'identifiersValidation';
            const textKey = kind === 'release_groups' ? 'customReleaseGroups' : kind === 'captures' ? 'customCaptures' : kind === 'post_render_words' ? 'postRenderWords' : 'customIdentifiers';
            if (this[timerKey]) { clearTimeout(this[timerKey]); this[timerKey] = null; }
            const lines = this.textToArray(this[textKey]);
            if (!lines.length) {
                this[stateKey] = { valid: true, errors: [] };
                return;
            }
            try {
                const result = await api.request('/nameparser/validate/' + kind, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(lines)
                });
                if (result.success) {
                    this[stateKey] = { valid: result.valid, errors: result.errors || [] };
                }
            } catch (e) {
                // 网络错误不更新状态
            }
        },
        async saveIdentifiers() {
            await this.validateRuleNow('identifiers');
            if (!this.identifiersValidation.valid) {
                window.showMessage && window.showMessage('识别词语法错误，请修正后再保存', 'error');
                return;
            }
            this.saving = true;
            try {
                const result = await api.request('/transfer_config/custom_identifiers', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(this.textToArray(this.customIdentifiers))
                });
                window.showMessage && window.showMessage(result.message || '已保存', result.success ? 'success' : 'error');
            } catch (e) {
                window.showMessage && window.showMessage('保存失败', 'error');
            } finally {
                this.saving = false;
            }
        },
        async saveCaptures() {
            await this.validateRuleNow('captures');
            if (!this.capturesValidation.valid) {
                window.showMessage && window.showMessage('捕获词语法错误，请修正后再保存', 'error');
                return;
            }
            this.saving = true;
            try {
                const result = await api.request('/transfer_config/custom_captures', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(this.textToArray(this.customCaptures))
                });
                window.showMessage && window.showMessage(result.message || '已保存', result.success ? 'success' : 'error');
            } catch (e) {
                window.showMessage && window.showMessage('保存失败', 'error');
            } finally {
                this.saving = false;
            }
        },
        async saveReleaseGroups() {
            await this.validateRuleNow('release_groups');
            if (!this.releaseGroupsValidation.valid) {
                window.showMessage && window.showMessage('制作组语法错误，请修正后再保存', 'error');
                return;
            }
            this.saving = true;
            try {
                const result = await api.request('/transfer_config/custom_release_groups', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(this.textToArray(this.customReleaseGroups))
                });
                window.showMessage && window.showMessage(result.message || '已保存', result.success ? 'success' : 'error');
            } catch (e) {
                window.showMessage && window.showMessage('保存失败', 'error');
            } finally {
                this.saving = false;
            }
        },
        async savePostRenderWords() {
            await this.validateRuleNow('post_render_words');
            if (!this.postRenderWordsValidation.valid) {
                window.showMessage && window.showMessage('渲染后处理词语法错误，请修正后再保存', 'error');
                return;
            }
            this.saving = true;
            try {
                const result = await api.request('/transfer_config/post_render_words', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(this.textToArray(this.postRenderWords))
                });
                window.showMessage && window.showMessage(result.message || '已保存', result.success ? 'success' : 'error');
            } catch (e) {
                window.showMessage && window.showMessage('保存失败', 'error');
            } finally {
                this.saving = false;
            }
        },
        initCategoryAceEditor() {
            this.$nextTick(() => {
                const container = this.$el ? this.$el.querySelector('#category-ace-editor') : null;
                if (!container || !window.ace) return;
                if (this.categoryAceEditor) return;
                const editor = window.ace.edit(container);
                editor.setTheme('ace/theme/dracula');
                editor.session.setMode('ace/mode/yaml');
                editor.setFontSize(14);
                editor.setShowPrintMargin(false);
                editor.session.setTabSize(2);
                editor.session.setUseSoftTabs(true);
                editor.setOptions({
                    wrap: false,
                    showGutter: true,
                    highlightActiveLine: true,
                    highlightGutterLine: true,
                });
                editor.setValue(this.categoryRaw || '', -1);
                editor.on('change', () => {
                    this.categoryRaw = editor.getValue();
                });
                this.categoryAceEditor = editor;
            });
        },
        destroyCategoryAceEditor() {
            if (this.categoryAceEditor) {
                this.categoryAceEditor.destroy();
                this.categoryAceEditor = null;
            }
        },
        syncCategoryAceEditor() {
            if (this.categoryAceEditor) {
                const currentValue = this.categoryAceEditor.getValue();
                if (currentValue !== this.categoryRaw) {
                    this.categoryAceEditor.setValue(this.categoryRaw || '', -1);
                }
            }
        },
        resetCategoryRaw() {
            if (this.categoryDefaultRaw) {
                this.categoryRaw = this.categoryDefaultRaw;
            } else {
                this.categoryRaw = '';
            }
            this.syncCategoryAceEditor();
        },
        async saveCategory() {
            this.categorySaving = true;
            try {
                const result = await api.request('/transfer_config/category/raw', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ content: this.categoryRaw })
                });
                if (result && result.success) {
                    await this.refreshCategoryRaw();
                    this.syncCategoryAceEditor();
                }
                window.showMessage && window.showMessage(result.message || '已保存', result.success ? 'success' : 'error');
            } catch (e) {
                window.showMessage && window.showMessage('保存失败', 'error');
            } finally {
                this.categorySaving = false;
            }
        },
        getCategoryScopeItems(scope = 'movie') {
            if (!this.categoryVisualDraft || !Array.isArray(this.categoryVisualDraft[scope])) {
                this.categoryVisualDraft = {
                    ...createEmptyCategoryVisualDraft(),
                    ...(this.categoryVisualDraft || {}),
                    [scope]: Array.isArray(this.categoryVisualDraft && this.categoryVisualDraft[scope]) ? this.categoryVisualDraft[scope] : [],
                };
            }
            return this.categoryVisualDraft[scope];
        },
        getCategoryScopeMeta(scope = 'movie') {
            return this.categoryScopeMeta[scope] || CATEGORY_VISUAL_SCOPE_META.movie;
        },
        getCategoryPresetFields(scope = 'movie') {
            return this.categoryPresetFields[scope] || [];
        },
        isCategoryRuleFallback(item = {}) {
            const payload = buildCategoryPayloadFromDraft({
                movie: item && item.scope === 'movie' ? [item] : [],
                tv: item && item.scope === 'tv' ? [item] : [],
            });
            const scope = item && item.scope === 'tv' ? 'tv' : 'movie';
            const name = String((item && item.name) || '').trim();
            return !Object.keys(((payload[scope] || {})[name]) || {}).length;
        },
        getCategoryKnownFieldValue(item = {}, fieldKey = '') {
            const rule = item && item.rule ? item.rule : {};
            if (fieldKey === 'release_year') {
                return stringifyCategoryScalarValue(rule[fieldKey]);
            }
            return normalizeCategoryArrayValue(rule[fieldKey]);
        },
        setCategoryKnownFieldValue(item = {}, fieldKey = '', value) {
            if (!item.rule) {
                item.rule = createEmptyCategoryVisualRule();
            }
            if (fieldKey === 'release_year') {
                item.rule[fieldKey] = stringifyCategoryScalarValue(value);
                return;
            }
            item.rule[fieldKey] = normalizeCategoryArrayValue(value);
        },
        isCategoryRawDirty() {
            return (this.categoryRaw || '') !== (this.savedCategoryRaw || '');
        },
        async refreshCategoryRaw() {
            try {
                const result = await api.request('/transfer_config/category/raw');
                if (result && result.success) {
                    this.categoryRaw = result.data || '';
                    this.savedCategoryRaw = this.categoryRaw;
                    this.syncCategoryAceEditor();
                }
            } catch (e) {
            }
        },
        async openCategoryEditor() {
            if (this.isCategoryRawDirty()) {
                window.showMessage && window.showMessage('原始 YAML 有未保存修改，请先保存后再打开可视化编辑', 'warning');
                return;
            }
            this.categoryEditorDialog = true;
            this.categoryEditorLoading = true;
            try {
                const result = await api.request('/transfer_config/category');
                if (result && result.success) {
                    this.categoryVisualDraft = buildCategoryVisualDraft(result.data || {});
                } else {
                    this.categoryVisualDraft = createEmptyCategoryVisualDraft();
                    window.showMessage && window.showMessage((result && result.message) || '加载可视化分类失败', 'error');
                }
            } catch (e) {
                this.categoryVisualDraft = createEmptyCategoryVisualDraft();
                window.showMessage && window.showMessage('加载可视化分类失败', 'error');
            } finally {
                this.categoryEditorLoading = false;
            }
        },
        closeCategoryEditor() {
            if (this.categoryEditorSaving) {
                return;
            }
            this.categoryEditorDialog = false;
        },
        addCategoryRule(scope = 'movie') {
            this.getCategoryScopeItems(scope).push(createCategoryVisualItem('', {}, scope));
        },
        removeCategoryRule(scope = 'movie', index = -1) {
            const items = this.getCategoryScopeItems(scope);
            if (index < 0 || index >= items.length) {
                return;
            }
            items.splice(index, 1);
        },
        moveCategoryRule(scope = 'movie', index = -1, direction = 0) {
            const items = this.getCategoryScopeItems(scope);
            const targetIndex = index + direction;
            if (index < 0 || index >= items.length || targetIndex < 0 || targetIndex >= items.length) {
                return;
            }
            const [item] = items.splice(index, 1);
            items.splice(targetIndex, 0, item);
        },
        async saveCategoryEditor() {
            this.categoryEditorSaving = true;
            try {
                const payload = buildCategoryPayloadFromDraft(this.categoryVisualDraft);
                const result = await api.request('/transfer_config/category', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if (result && result.success) {
                    await this.refreshCategoryRaw();
                    this.categoryVisualDraft = buildCategoryVisualDraft(payload);
                    this.categoryEditorDialog = false;
                }
                window.showMessage && window.showMessage((result && result.message) || '已保存', result && result.success ? 'success' : 'error');
            } catch (e) {
                window.showMessage && window.showMessage('保存可视化分类失败', 'error');
            } finally {
                this.categoryEditorSaving = false;
            }
        },
        scheduleBasicInspect(immediate = false) {
            if (!this.basicLoaded || this.loading) return;
            if (this.basicInspectTimer) {
                clearTimeout(this.basicInspectTimer);
                this.basicInspectTimer = null;
            }
            if (immediate) {
                this.inspectBasicDraft();
                return;
            }
            this.basicInspectTimer = setTimeout(() => {
                this.inspectBasicDraft();
            }, 280);
        },
        async inspectBasicDraft() {
            if (this.basicInspectTimer) {
                clearTimeout(this.basicInspectTimer);
                this.basicInspectTimer = null;
            }
            const requestSeq = ++this.basicInspectSeq;
            this.basicInspecting = true;
            try {
                const result = await api.request('/transfer_config/basic/inspect', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(this.basicConfig)
                });
                if (requestSeq !== this.basicInspectSeq) {
                    return this.basicInspection;
                }
                if (result.success) {
                    if (Array.isArray(result.field_catalog)) {
                        this.setFieldCatalog(result.field_catalog);
                    }
                    if (Array.isArray(result.media_probe_field_catalog)) {
                        this.setMediaProbeFieldCatalog(result.media_probe_field_catalog);
                    }
                    if (Array.isArray(result.notify_field_catalog)) {
                        this.setNotifyFieldCatalog(result.notify_field_catalog);
                    }
                    if (result.inspection) {
                        this.basicInspection = this.normalizeBasicInspection(result.inspection);
                        this.basicEditorTypes.forEach(editor => {
                            const normalizedTemplate = this.basicInspection[editor.key]?.normalized_template;
                            if (typeof normalizedTemplate === 'string' && this.basicConfig[editor.configKey] !== normalizedTemplate) {
                                this.basicConfig[editor.configKey] = normalizedTemplate;
                            }
                        });
                        const normalizedNotifyTemplate = this.basicInspection.organize_notify?.normalized_template;
                        if (typeof normalizedNotifyTemplate === 'string' && this.basicConfig.organize_notify_template !== normalizedNotifyTemplate) {
                            this.basicConfig.organize_notify_template = normalizeOrganizeNotifyTemplate(normalizedNotifyTemplate);
                        }
                        let needsVisualSync = false;
                        this.basicEditorTypes.forEach(editor => {
                            const compiled = this.compileVisualTemplate(editor.key);
                            const normalized = this.basicInspection[editor.key]?.normalized_template;
                            if (typeof normalized === 'string' && compiled !== normalized) {
                                needsVisualSync = true;
                            }
                        });
                        if (needsVisualSync) {
                            this.syncVisualEditorsFromInspection();
                        }
                    }
                }
            } catch (e) {
                console.error('基础配置解析失败', e);
            } finally {
                if (requestSeq === this.basicInspectSeq) {
                    this.basicInspecting = false;
                }
            }
            return this.basicInspection;
        },
        async saveBasic() {
            await this.inspectBasicDraft();
            if (!this.isBasicDirty()) {
                window.showMessage && window.showMessage('基础配置未修改', 'success');
                return;
            }
            if (!this.basicInspection.movie.valid) {
                window.showMessage && window.showMessage(this.basicInspection.movie.error || '电影重命名模板不正确，请重新检查', 'error');
                return;
            }
            if (!this.basicInspection.tv.valid) {
                window.showMessage && window.showMessage(this.basicInspection.tv.error || '电视剧重命名模板不正确，请重新检查', 'error');
                return;
            }
            if (!this.getOrganizeNotifyInspection().valid) {
                window.showMessage && window.showMessage(this.getOrganizeNotifyInspection().error || '整理 Telegram 通知模板不正确，请重新检查', 'error');
                return;
            }
            const payload = {
                movie_rename_format: this.basicConfig.movie_rename_format || '',
                tv_rename_format: this.basicConfig.tv_rename_format || '',
                organize_notify_enabled: !!this.basicConfig.organize_notify_enabled,
                organize_notify_template: normalizeOrganizeNotifyTemplate(this.basicConfig.organize_notify_template || ''),
                media_info_extract_trigger_fields: normalizeTransferMediaProbeFields(this.basicConfig.media_info_extract_trigger_fields || []),
                tmdb_cache_enabled: !!this.basicConfig.tmdb_cache_enabled,
                meta_cache_expire_hours: this.basicConfig.meta_cache_expire_hours,
                gpt_cache_enabled: !!this.basicConfig.gpt_cache_enabled,
                gpt_cache_expire_hours: this.basicConfig.gpt_cache_expire_hours,
            };
            this.saving = true;
            try {
                const result = await api.request('/transfer_config/basic', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if (result.success) {
                    this.applyBasicResponse(result, { markSaved: true });
                    window.showMessage && window.showMessage(result.message || '基础配置已保存', 'success');
                } else {
                    if (result.defaults) {
                        const nextDefaults = { ...this.basicDefaults, ...result.defaults };
                        nextDefaults.organize_notify_template = normalizeOrganizeNotifyTemplate(nextDefaults.organize_notify_template || '');
                        nextDefaults.media_info_extract_trigger_fields = normalizeTransferMediaProbeFields(nextDefaults.media_info_extract_trigger_fields || []);
                        this.basicDefaults = nextDefaults;
                    }
                    if (Array.isArray(result.field_catalog)) {
                        this.setFieldCatalog(result.field_catalog);
                    }
                    if (Array.isArray(result.media_probe_field_catalog)) {
                        this.setMediaProbeFieldCatalog(result.media_probe_field_catalog);
                    }
                    if (Array.isArray(result.notify_field_catalog)) {
                        this.setNotifyFieldCatalog(result.notify_field_catalog);
                    }
                    if (result.inspection) {
                        this.basicInspection = this.normalizeBasicInspection(result.inspection);
                    }
                    window.showMessage && window.showMessage(result.message || '保存失败', 'error');
                }
            } catch (e) {
                window.showMessage && window.showMessage('保存失败', 'error');
            } finally {
                this.saving = false;
            }
        },
        async clearTmdbCache() {
            this.clearingTmdbCache = true;
            try {
                const result = await api.request('/transfer_config/cache/tmdb/clear', { method: 'POST' });
                if (result.success) {
                    window.showMessage && window.showMessage(result.message || 'TMDB 识别缓存已清空', 'success');
                } else {
                    window.showMessage && window.showMessage(result.message || '清空 TMDB 识别缓存失败', 'error');
                }
            } catch (e) {
                window.showMessage && window.showMessage('清空 TMDB 识别缓存失败', 'error');
            } finally {
                this.clearingTmdbCache = false;
            }
        },
        async clearOpenAiCache() {
            this.clearingOpenAiCache = true;
            try {
                const result = await api.request('/transfer_config/cache/openai/clear', { method: 'POST' });
                if (result.success) {
                    window.showMessage && window.showMessage(result.message || 'OpenAI 辅助识别缓存已清空', 'success');
                } else {
                    window.showMessage && window.showMessage(result.message || '清空 OpenAI 辅助识别缓存失败', 'error');
                }
            } catch (e) {
                window.showMessage && window.showMessage('清空 OpenAI 辅助识别缓存失败', 'error');
            } finally {
                this.clearingOpenAiCache = false;
            }
        },
        copyArrow() {
            const text = ' => ';
            if (navigator.clipboard && window.isSecureContext) {
                navigator.clipboard.writeText(text).then(() => {
                    window.showMessage && window.showMessage('已复制 =>', 'success');
                }).catch(() => {
                    this.fallbackCopy(text);
                });
            } else {
                this.fallbackCopy(text);
            }
        },
        fallbackCopy(text) {
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.left = '-9999px';
            textArea.style.top = '0';
            textArea.setAttribute('readonly', '');
            document.body.appendChild(textArea);
            const range = document.createRange();
            range.selectNodeContents(textArea);
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);
            textArea.setSelectionRange(0, text.length);
            try {
                document.execCommand('copy');
                window.showMessage && window.showMessage('已复制 =>', 'success');
            } catch (err) {
                window.showMessage && window.showMessage('复制失败，请手动复制', 'error');
            } finally {
                document.body.removeChild(textArea);
            }
        },
        async resetBasicTemplate(type) {
            if (type === 'movie') {
                this.basicConfig.movie_rename_format = this.basicDefaults.movie_rename_format || '';
            } else if (type === 'tv') {
                this.basicConfig.tv_rename_format = this.basicDefaults.tv_rename_format || '';
            } else if (type === 'organize_notify') {
                this.basicConfig.organize_notify_template = normalizeOrganizeNotifyTemplate(this.basicDefaults.organize_notify_template || '');
            }
            this.scheduleBasicInspect(true);
            await this.saveBasic();
        }
    },
    template: `
        <div class="transfer-config-page">
            <v-card class="glass-card" style="border-radius: 16px; overflow: hidden;">
                <v-tabs v-if="!hideTabs" v-model="activeTab" color="primary" show-arrows>
                    <v-tab value="basic">
                        <v-icon start size="18">mdi-tune-variant</v-icon>
                        基础配置
                    </v-tab>
                    <v-tab value="identifiers">
                        <v-icon start size="18">mdi-text-search</v-icon>
                        自定义识别词
                    </v-tab>
                    <v-tab value="release_groups">
                        <v-icon start size="18">mdi-account-group</v-icon>
                        自定义制作组
                    </v-tab>
                    <v-tab value="captures">
                        <v-icon start size="18">mdi-crosshairs-gps</v-icon>
                        自定义捕获词
                    </v-tab>
                    <v-tab value="category">
                        <v-icon start size="18">mdi-folder-multiple</v-icon>
                        二级分类管理
                    </v-tab>
                </v-tabs>
                <v-divider></v-divider>

                <v-card-text style="padding: 14px 16px;">
                    <v-progress-linear v-if="loading" indeterminate color="primary" class="mb-4"></v-progress-linear>

                    <v-window v-model="activeTab" :touch="false">
                        <v-window-item value="basic">
                            <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 14px;">
                                <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap; min-height: 32px; min-width: 0;">
                                    <v-chip size="small" :color="isBasicDirty() ? 'warning' : 'success'" variant="tonal">
                                        {{ isBasicDirty() ? '未保存' : '已保存' }}
                                    </v-chip>
                                    <span style="font-size: 12px; color: rgba(var(--v-theme-on-surface),0.68); line-height: 1.7;">
                                        基础配置修改后需点击右上角“保存基础配置”，写入配置后会立即生效。
                                    </span>
                                </div>
                                <div style="display: flex; justify-content: flex-end; align-items: center; flex-wrap: wrap; gap: 8px; min-width: 0; margin-left: auto;">
                                    <v-btn color="primary" variant="elevated" size="small" :loading="saving" :disabled="loading || saving" style="border-radius: 9px; min-width: 108px; height: 34px; font-weight: 600; box-shadow: 0 6px 14px rgba(var(--v-theme-primary),0.15);" @click="saveBasic">
                                        <v-icon start size="16">mdi-content-save</v-icon>
                                        保存配置
                                    </v-btn>
                                </div>
                            </div>
                            <v-row class="mb-1">
                                <v-col cols="12">
                                    <v-card variant="outlined" style="border-radius: 16px; border-color: rgba(var(--v-theme-primary),0.18); height: 100%;">
                                        <div style="padding: 16px 18px;">
                                            <div style="display: flex; align-items: center; gap: 8px; font-size: 16px; font-weight: 600; margin-bottom: 6px;">
                                                <v-icon color="primary">mdi-database-search-outline</v-icon>
                                                <span>识别缓存</span>
                                            </div>
                                            <div style="font-size: 12px; color: rgba(var(--v-theme-on-surface),0.62); line-height: 1.7; margin-bottom: 12px;">
                                                控制 TMDB 与 OpenAI 辅助识别结果缓存，以及缓存过期时间。
                                            </div>
                                            <v-switch v-model="basicConfig.tmdb_cache_enabled" label="启用 TMDB 识别缓存" color="primary" hide-details density="compact" :disabled="loading || saving"></v-switch>
                                            <v-text-field v-model.number="basicConfig.meta_cache_expire_hours" type="number" min="1" label="TMDB 缓存过期时间（小时）" variant="outlined" density="compact" hide-details class="mt-3" :disabled="loading || saving"></v-text-field>
                                            <div style="display: flex; justify-content: flex-end; margin-top: 8px;">
                                                <v-btn color="primary" variant="tonal" size="small" :loading="clearingTmdbCache" :disabled="loading || saving || clearingTmdbCache || clearingOpenAiCache" @click="clearTmdbCache">清空 TMDB 缓存</v-btn>
                                            </div>
                                            <v-switch v-model="basicConfig.gpt_cache_enabled" label="启用 OpenAI 辅助识别缓存" color="primary" hide-details density="compact" class="mt-3" :disabled="loading || saving"></v-switch>
                                            <v-text-field v-model.number="basicConfig.gpt_cache_expire_hours" type="number" min="1" label="OpenAI 辅助缓存时间（小时）" variant="outlined" density="compact" hide-details class="mt-3" :disabled="loading || saving"></v-text-field>
                                            <div style="display: flex; justify-content: flex-end; margin-top: 8px;">
                                                <v-btn color="primary" variant="tonal" size="small" :loading="clearingOpenAiCache" :disabled="loading || saving || clearingTmdbCache || clearingOpenAiCache" @click="clearOpenAiCache">清空 OpenAI 辅助缓存</v-btn>
                                            </div>
                                        </div>
                                    </v-card>
                                </v-col>
                            </v-row>
                            <v-row class="mb-1">
                                <v-col cols="12">
                                    <v-card variant="outlined" style="border-radius: 16px; border-color: rgba(var(--v-theme-primary),0.18); overflow: hidden;">
                                        <div style="padding: 18px;">
                                            <div style="display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; flex-wrap: wrap; margin-bottom: 12px;">
                                                <div>
                                                    <div style="display: flex; align-items: center; gap: 8px; font-size: 18px; font-weight: 600;">
                                                        <v-icon color="primary">mdi-filmstrip-box-multiple</v-icon>
                                                        <span>媒体信息提取</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div style="padding: 14px; border-radius: 14px; background: rgba(61,111,213,0.05); border: 1px solid rgba(61,111,213,0.12);">
                                                <div style="font-size: 13px; font-weight: 600; margin-bottom: 4px;">缺少以下字段时触发媒体信息提取补全文件名</div>
                                                <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                                                    <v-chip
                                                        v-for="item in getMediaProbeFieldItems()"
                                                        :key="item.key"
                                                        variant="outlined"
                                                        :style="getMediaProbeFieldChipStyle(item)"
                                                        :disabled="loading || saving"
                                                        @click="toggleMediaProbeField(item.key)"
                                                    >
                                                        {{ item.label }}
                                                    </v-chip>
                                                </div>
                                                <div style="margin-top: 10px; font-size: 12px; color: rgba(var(--v-theme-on-surface),0.58); line-height: 1.7;">
                                                    已选 {{ basicConfig.media_info_extract_trigger_fields.length }} 个字段
                                                </div>
                                            </div>
                                        </div>
                                    </v-card>
                                </v-col>
                            </v-row>
                            <v-row>
                                <v-col cols="12">
                                    <v-card variant="outlined" style="border-radius: 16px; border-color: rgba(var(--v-theme-primary),0.18); overflow: hidden;">
                                        <div style="padding: 18px;">
                                            <div style="display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; flex-wrap: wrap; margin-bottom: 12px;">
                                                <div>
                                                    <div style="display: flex; align-items: center; gap: 8px; font-size: 18px; font-weight: 600;">
                                                        <v-icon color="primary">mdi-telegram</v-icon>
                                                        <span>整理结果 Telegram 通知</span>
                                                    </div>
                                                </div>
                                                <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                                                    <v-chip size="small" :color="getOrganizeNotifyInspection().valid ? 'success' : 'error'" variant="tonal">
                                                        {{ getOrganizeNotifyInspection().valid ? '语法正确' : '模板错误' }}
                                                    </v-chip>
                                                    <v-chip size="small" :color="basicConfig.organize_notify_enabled ? 'primary' : 'default'" variant="outlined">
                                                        {{ basicConfig.organize_notify_enabled ? '已启用' : '未启用' }}
                                                    </v-chip>
                                                    <v-btn color="primary" variant="tonal" size="small" style="border-radius: 8px;" @click="resetBasicTemplate('organize_notify')">恢复默认通知模板</v-btn>
                                                </div>
                                            </div>
                                            <v-switch
                                                v-model="basicConfig.organize_notify_enabled"
                                                label="启用整理结果 Telegram 通知"
                                                color="primary"
                                                hide-details
                                                density="compact"
                                                :disabled="loading || saving"
                                            ></v-switch>
                                            <v-progress-linear v-if="basicInspecting" indeterminate color="primary" class="mb-3 mt-3"></v-progress-linear>
                                            <div style="padding: 14px; border-radius: 14px; background: rgba(61,111,213,0.05); border: 1px solid rgba(61,111,213,0.12); margin-top: 12px; margin-bottom: 12px;">
                                                <v-textarea
                                                    :model-value="basicConfig.organize_notify_template"
                                                    @update:modelValue="setOrganizeNotifyTemplate($event)"
                                                    label="整理 TG 通知模板"
                                                    variant="outlined"
                                                    density="comfortable"
                                                    rows="5"
                                                    no-resize
                                                    persistent-hint
                                                    hint=""
                                                    :disabled="loading || saving"
                                                    style="font-family: monospace; font-size: 13px;"
                                                ></v-textarea>
                                            </div>
                                            <v-alert
                                                v-if="getOrganizeNotifyInspection().error"
                                                type="error"
                                                variant="tonal"
                                                density="comfortable"
                                                class="mb-3"
                                                style="border-radius: 12px;"
                                            >
                                                {{ getOrganizeNotifyInspection().error }}
                                            </v-alert>
                                            <v-alert
                                                v-else-if="getOrganizeNotifyInspection().warning"
                                                type="warning"
                                                variant="tonal"
                                                density="comfortable"
                                                class="mb-3"
                                                style="border-radius: 12px;"
                                            >
                                                {{ getOrganizeNotifyInspection().warning }}
                                            </v-alert>
                                            <div style="display: flex; flex-wrap: wrap; gap: 12px; margin-top: 12px;">
                                                <v-btn color="primary" variant="tonal" size="large" style="border-radius: 10px; min-width: 144px; padding: 0 18px;" @click="organizeNotifyPreviewDialog = true">
                                                    <v-icon left size="18">mdi-eye-outline</v-icon>
                                                    浏览模板
                                                </v-btn>
                                                <v-btn color="primary" variant="outlined" size="large" style="border-radius: 10px; min-width: 144px; padding: 0 18px;" @click="organizeNotifyFieldDialog = true">
                                                    <v-icon left size="18">mdi-shape-outline</v-icon>
                                                    字段说明
                                                </v-btn>
                                            </div>
                                        </div>
                                    </v-card>
                                </v-col>
                            </v-row>
                            <v-row>
                                <v-col v-for="editor in basicEditorTypes" :key="editor.key" cols="12">
                                    <v-card variant="outlined" style="border-radius: 16px; border-color: rgba(var(--v-theme-primary),0.18); overflow: hidden;">
                                        <div style="padding: 18px 18px 8px 18px;">
                                            <div style="display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; flex-wrap: wrap; margin-bottom: 12px;">
                                                <div>
                                                    <div style="display: flex; align-items: center; gap: 8px; font-size: 18px; font-weight: 600;">
                                                        <v-icon color="primary">{{ editor.icon }}</v-icon>
                                                        <span>{{ editor.title }}</span>
                                                    </div>
                                                    <div style="margin-top: 6px; font-size: 12px; color: rgba(var(--v-theme-on-surface),0.65); line-height: 1.7;">
                                                        支持直接粘贴完整模板；字段顺序和示例预览会自动重新整理，保存前不会覆盖现有配置。
                                                    </div>
                                                </div>
                                                <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                                                    <v-chip size="small" :color="getEditorInspection(editor).valid ? 'success' : 'error'" variant="tonal">
                                                        {{ getEditorInspection(editor).valid ? '语法正确' : '模板错误' }}
                                                    </v-chip>
                                                    <v-chip size="small" :color="isEditorDirty(editor) ? 'warning' : 'primary'" variant="outlined">
                                                        {{ isEditorDirty(editor) ? '未保存' : '已保存' }}
                                                    </v-chip>
                                                    <v-btn color="primary" variant="tonal" size="small" style="border-radius: 8px;" @click="resetBasicTemplate(editor.key)">恢复默认{{ editor.shortTitle }}模板</v-btn>
                                                </div>
                                            </div>
                                            <v-progress-linear v-if="basicInspecting" indeterminate color="primary" class="mb-3"></v-progress-linear>
                                            <div style="padding: 14px; border-radius: 14px; background: rgba(61,111,213,0.05); border: 1px solid rgba(61,111,213,0.12); margin-bottom: 12px;">
                                                <div style="font-size: 13px; font-weight: 600; margin-bottom: 4px;">模板源码 / 粘贴区</div>
                                                <div style="font-size: 12px; color: rgba(var(--v-theme-on-surface),0.55); margin-bottom: 10px; line-height: 1.6;">
                                                    你也可以直接粘贴完整 Jinja2 模板；系统会重新整理成下面的拖拽块布局。
                                                </div>
                                                <v-textarea
                                                    :model-value="basicConfig[editor.configKey]"
                                                    @update:modelValue="setBasicTemplate(editor, $event)"
                                                    :label="editor.title + '源码'"
                                                    variant="outlined"
                                                    density="comfortable"
                                                    :rows="editor.key === 'tv' ? 5 : 4"
                                                    no-resize
                                                    persistent-hint
                                                    :hint="editor.key === 'tv' ? '可粘贴电视剧 Jinja2 模板；校验通过后会自动转成可拖拽块' : '可粘贴电影 Jinja2 模板；校验通过后会自动转成可拖拽块'"
                                                    :disabled="loading || saving"
                                                    style="font-family: monospace; font-size: 13px;"
                                                ></v-textarea>
                                            </div>
                                            <v-row style="margin: 0 -6px;">
                                                <v-col cols="12" md="7" lg="8" style="padding: 6px;">
                                                    <div style="padding: 12px; border-radius: 14px; background: rgba(61,111,213,0.05); border: 1px solid rgba(61,111,213,0.12); margin-bottom: 10px;">
                                                        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; flex-wrap: wrap; margin-bottom: 10px;">
                                                            <div>
                                                                <div style="font-size: 13px; font-weight: 600; margin-bottom: 4px;">拖拽式规则编排</div>
                                                                <div style="font-size: 12px; color: rgba(var(--v-theme-on-surface),0.58); line-height: 1.7;">
                                                                    PC 端可鼠标左键按住拖动，移动端可直接按住拖动到标签前后或层内空白处；电影固定两层，电视剧固定三层。
                                                                </div>
                                                            </div>
                                                            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                                                                <v-btn size="small" variant="text" color="primary" style="border-radius: 8px; min-width: 0;" @click="clearVisualTemplate(editor.key)">
                                                                    清空拖拽区
                                                                </v-btn>
                                                            </div>
                                                        </div>
                                                        <div style="display: flex; flex-direction: column; gap: 8px;">
                                                            <div v-for="(level, levelIndex) in getVisualLevels(editor.key)" :key="level.id" style="padding: 10px; border-radius: 12px; background: rgba(var(--v-theme-surface),0.92); border: 1px solid rgba(var(--v-theme-on-surface),0.06);">
                                                                <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 8px;">
                                                                    <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                                                                        <v-chip size="small" color="primary" variant="tonal" style="border-radius: 10px;">{{ getEditorLevelLabel(editor.key, levelIndex) }}</v-chip>
                                                                        <span style="font-size: 11px; color: rgba(var(--v-theme-on-surface),0.55);">拖到标签前后即可插入</span>
                                                                    </div>
                                                                    <span style="font-size: 11px; color: rgba(var(--v-theme-on-surface),0.48);">
                                                                        {{ editor.key === 'movie' ? '固定 2 层' : '固定 3 层' }}
                                                                    </span>
                                                                </div>
                                                                <div v-if="!level.blocks.length"
                                                                    :data-transfer-level-zone="editor.key + ':' + levelIndex"
                                                                    :data-transfer-level-editor="editor.key"
                                                                    :data-transfer-level-index="levelIndex"
                                                                    :data-transfer-block-count="level.blocks.length"
                                                                    :data-transfer-drop-zone="getVisualDropZoneKey(editor.key, levelIndex, 0)"
                                                                    :style="getDropZoneStyle(editor.key, levelIndex, 0, true)"
                                                                    @dragenter.prevent="handleLevelDragOver(editor.key, levelIndex, $event)"
                                                                    @dragover.prevent="handleLevelDragOver(editor.key, levelIndex, $event)"
                                                                    @drop="handleLevelDrop(editor.key, levelIndex, $event)"
                                                                    style="display: flex; align-items: center; justify-content: center; color: rgba(var(--v-theme-on-surface),0.56); font-size: 12px; padding: 8px 10px;">
                                                                    点击右侧字段或字符，也可直接拖到这里
                                                                </div>
                                                                <div v-else
                                                                    :data-transfer-level-zone="editor.key + ':' + levelIndex"
                                                                    :data-transfer-level-editor="editor.key"
                                                                    :data-transfer-level-index="levelIndex"
                                                                    :data-transfer-block-count="level.blocks.length"
                                                                    style="display: flex; align-items: center; flex-wrap: wrap; gap: 2px;"
                                                                    @dragenter.prevent="handleLevelDragOver(editor.key, levelIndex, $event)"
                                                                    @dragover.prevent="handleLevelDragOver(editor.key, levelIndex, $event)"
                                                                    @drop="handleLevelDrop(editor.key, levelIndex, $event)">
                                                                    <div
                                                                        :data-transfer-drop-zone="getVisualDropZoneKey(editor.key, levelIndex, 0)"
                                                                        :style="getDropZoneStyle(editor.key, levelIndex, 0)"
                                                                        @dragenter.prevent="handleDropZoneEnter(editor.key, levelIndex, 0)"
                                                                        @dragover.prevent="handleDropZoneEnter(editor.key, levelIndex, 0)"
                                                                        @drop="handleDropOnZone(editor.key, levelIndex, 0, $event)"
                                                                    ></div>
                                                                    <div v-for="(block, blockIndex) in level.blocks" :key="block.id" :data-transfer-block-wrapper="editor.key + ':' + levelIndex + ':' + blockIndex" :data-transfer-block-editor="editor.key" :data-transfer-level-index="levelIndex" :data-transfer-block-index="blockIndex" style="display: inline-flex; align-items: center; gap: 2px; max-width: 100%;" @dragenter.prevent="handleBlockDragOver(editor.key, levelIndex, blockIndex, $event)" @dragover.prevent="handleBlockDragOver(editor.key, levelIndex, blockIndex, $event)" @drop="handleBlockDrop(editor.key, levelIndex, blockIndex, $event)">
                                                                        <div
                                                                            draggable="true"
                                                                            @dragstart="handleBlockDragStart(editor.key, levelIndex, blockIndex, $event)"
                                                                            @dragend="handleDragEnd"
                                                                            @touchstart.stop="queueTouchBlockDrag(editor.key, levelIndex, blockIndex, $event)"
                                                                            style="display: inline-flex; cursor: grab; touch-action: none; max-width: 100%; -webkit-user-select: none; user-select: none;"
                                                                        >
                                                                            <v-chip
                                                                                size="small"
                                                                                variant="flat"
                                                                                closable
                                                                                :style="getVisualBlockChipStyle(block)"
                                                                                @click:close="removeVisualBlock(editor.key, levelIndex, blockIndex)"
                                                                            >
                                                                                {{ getVisualBlockText(block) }}
                                                                            </v-chip>
                                                                        </div>
                                                                        <div
                                                                            :data-transfer-drop-zone="getVisualDropZoneKey(editor.key, levelIndex, blockIndex + 1)"
                                                                            :style="getDropZoneStyle(editor.key, levelIndex, blockIndex + 1)"
                                                                            @dragenter.prevent="handleDropZoneEnter(editor.key, levelIndex, blockIndex + 1)"
                                                                            @dragover.prevent="handleDropZoneEnter(editor.key, levelIndex, blockIndex + 1)"
                                                                            @drop="handleDropOnZone(editor.key, levelIndex, blockIndex + 1, $event)"
                                                                        ></div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <v-alert
                                                        v-if="getEditorInspection(editor).error"
                                                        type="error"
                                                        variant="tonal"
                                                        density="comfortable"
                                                        class="mb-3"
                                                        style="border-radius: 12px;"
                                                    >
                                                        {{ getEditorInspection(editor).error }}
                                                    </v-alert>
                                                    <v-alert
                                                        v-else-if="getEditorInspection(editor).warning"
                                                        type="warning"
                                                        variant="tonal"
                                                        density="comfortable"
                                                        class="mb-3"
                                                        style="border-radius: 12px;"
                                                    >
                                                        {{ getEditorInspection(editor).warning }}
                                                    </v-alert>
                                                </v-col>
                                                <v-col cols="12" md="5" lg="4" style="padding: 6px;">
                                                    <div style="padding: 10px 12px; border-radius: 12px; background: rgba(61,111,213,0.08); border: 1px solid rgba(61,111,213,0.14); margin-bottom: 10px;">
                                                        <div style="display: flex; align-items: center; gap: 6px; font-size: 12px; color: rgba(var(--v-theme-on-surface),0.65); margin-bottom: 8px;">
                                                            <v-icon size="14" color="primary">mdi-file-tree-outline</v-icon>
                                                            {{ editor.previewLabel }}
                                                        </div>
                                                        <div style="font-family: monospace; font-size: 13px; line-height: 1.7; word-break: break-all; min-height: 44px;">
                                                            {{ getEditorInspection(editor).preview || '当前模板未通过校验，暂无示例预览' }}
                                                        </div>
                                                    </div>
                                                    <div style="padding: 12px; border-radius: 12px; background: rgba(var(--v-theme-on-surface),0.03); border: 1px solid rgba(var(--v-theme-on-surface),0.06); margin-bottom: 10px;">
                                                        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; flex-wrap: wrap; margin-bottom: 10px;">
                                                            <div>
                                                                <div style="font-size: 13px; font-weight: 600; margin-bottom: 4px;">字段 / 字符库</div>
                                                                <div style="font-size: 12px; color: rgba(var(--v-theme-on-surface),0.58); line-height: 1.7;">
                                                                    点击可追加到文件名层，也可直接拖到左侧任意位置；字符会按实际样子显示，复杂表达式仍可在源码区补充。
                                                                </div>
                                                            </div>
                                                            <v-chip size="small" color="primary" variant="tonal" style="border-radius: 10px;">
                                                                {{ getFilteredFieldCatalog(editor.key).length }} 个字段
                                                            </v-chip>
                                                        </div>
                                                        <div style="display: flex; flex-direction: column; gap: 12px;">
                                                            <div>
                                                                <div style="font-size: 11px; color: rgba(var(--v-theme-on-surface),0.56); margin-bottom: 8px;">字段库</div>
                                                                <div style="display: flex; flex-wrap: wrap; gap: 6px;">
                                                                    <div
                                                                        v-for="item in getFilteredFieldCatalog(editor.key)"
                                                                        :key="editor.key + '-catalog-item-' + item.key"
                                                                        draggable="true"
                                                                        @dragstart="handlePaletteDragStart(editor.key, item, $event)"
                                                                        @dragend="handleDragEnd"
                                                                        @touchstart.stop="queueTouchPaletteDrag(editor.key, item, $event)"
                                                                        style="display: inline-flex; max-width: 100%; touch-action: none; -webkit-user-select: none; user-select: none;"
                                                                    >
                                                                        <v-chip size="small" variant="flat" :style="getPaletteChipStyle(item)" @click="appendFieldBlock(editor.key, item)">
                                                                            {{ getPaletteItemText(item) }}
                                                                        </v-chip>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <div style="font-size: 11px; color: rgba(var(--v-theme-on-surface),0.56); margin-bottom: 8px;">字符库</div>
                                                                <div style="display: flex; flex-wrap: wrap; gap: 6px;">
                                                                    <div
                                                                        v-for="item in literalPalette"
                                                                        :key="editor.key + '-literal-' + item.key"
                                                                        draggable="true"
                                                                        @dragstart="handlePaletteDragStart(editor.key, item, $event)"
                                                                        @dragend="handleDragEnd"
                                                                        @touchstart.stop="queueTouchPaletteDrag(editor.key, item, $event)"
                                                                        style="display: inline-flex; max-width: 100%; touch-action: none; -webkit-user-select: none; user-select: none;"
                                                                    >
                                                                        <v-chip size="small" variant="flat" :style="getPaletteChipStyle(item)" @click="appendLiteralBlock(editor.key, item)">
                                                                            {{ getPaletteItemText(item) }}
                                                                        </v-chip>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </v-col>
                                            </v-row>
                                        </div>
                                    </v-card>
                                </v-col>
                            </v-row>
                        </v-window-item>

                        <v-window-item value="identifiers">
                            <div style="display: flex; align-items: flex-start; gap: 10px; flex-wrap: wrap; margin-bottom: 12px;">
                                <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                                    <v-chip size="small" :color="identifiersValidation.valid ? 'success' : 'error'" variant="tonal">
                                        {{ identifiersValidation.valid ? '语法正确' : '语法错误' }}
                                    </v-chip>
                                </div>
                                <div style="display: flex; justify-content: flex-end; align-items: center; flex-wrap: wrap; gap: 8px; min-width: 0; margin-left: auto;">
                                    <v-btn color="primary" variant="tonal" size="small" :loading="saving" :disabled="loading || saving || !identifiersValidation.valid" style="border-radius: 8px; min-width: 0;" @click="saveIdentifiers">
                                        <v-icon start size="16">mdi-content-save</v-icon>
                                        保存
                                    </v-btn>
                                </div>
                            </div>
                            <v-textarea
                                v-model="customIdentifiers"
                                variant="outlined"
                                density="comfortable"
                                rows="12"
                                no-resize
                                placeholder="一行一个，# 为注释&#10;被替换词 => 替换词&#10;前定位词 <> 后定位词 >> 集偏移量（EP）"
                                hint="滚动查看完整内容"
                                persistent-hint
                                :disabled="loading"
                                style="font-family: monospace; font-size: 13px;"
                            ></v-textarea>
                            <div v-if="identifiersValidation.errors.length" style="margin-top: 8px; padding: 10px 14px; border-radius: 10px; background: rgba(var(--v-theme-error),0.06); border: 1px solid rgba(var(--v-theme-error),0.18);">
                                <div v-for="err in identifiersValidation.errors" :key="'id-err-'+err.line" style="font-size: 13px; line-height: 1.7; color: rgb(var(--v-theme-error));">
                                    第 {{ err.line }} 行: {{ err.error }}
                                </div>
                            </div>
                            <div style="margin-top: 6px;">
                                <v-btn color="primary" variant="tonal" size="small" style="border-radius: 8px;" @click="copyArrow">复制箭头</v-btn>
                            </div>
                        </v-window-item>

                        <!-- 自定义制作组 -->
                        <v-window-item value="release_groups">
                            <div style="display: flex; align-items: flex-start; gap: 10px; flex-wrap: wrap; margin-bottom: 12px;">
                                <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                                    <v-chip size="small" :color="releaseGroupsValidation.valid ? 'success' : 'error'" variant="tonal">
                                        {{ releaseGroupsValidation.valid ? '语法正确' : '语法错误' }}
                                    </v-chip>
                                </div>
                                <div style="display: flex; justify-content: flex-end; align-items: center; flex-wrap: wrap; gap: 8px; min-width: 0; margin-left: auto;">
                                    <v-btn color="primary" variant="tonal" size="small" :loading="saving" :disabled="loading || saving || !releaseGroupsValidation.valid" style="border-radius: 8px; min-width: 0;" @click="saveReleaseGroups">
                                        <v-icon start size="16">mdi-content-save</v-icon>
                                        保存
                                    </v-btn>
                                </div>
                            </div>
                            <v-textarea
                                v-model="customReleaseGroups"
                                variant="outlined"
                                density="comfortable"
                                rows="12"
                                no-resize
                                placeholder="一行代表一个制作组/字幕组，支持正则表达式"
                                hint="滚动查看完整内容"
                                persistent-hint
                                :disabled="loading"
                                style="font-family: monospace; font-size: 13px;"
                            ></v-textarea>
                            <div v-if="releaseGroupsValidation.errors.length" style="margin-top: 8px; padding: 10px 14px; border-radius: 10px; background: rgba(var(--v-theme-error),0.06); border: 1px solid rgba(var(--v-theme-error),0.18);">
                                <div v-for="err in releaseGroupsValidation.errors" :key="'rg-err-'+err.line" style="font-size: 13px; line-height: 1.7; color: rgb(var(--v-theme-error));">
                                    第 {{ err.line }} 行: {{ err.error }}
                                </div>
                            </div>
                            <div style="margin-top: 6px;">
                                <v-btn color="primary" variant="tonal" size="small" style="border-radius: 8px;" @click="copyArrow">复制箭头</v-btn>
                            </div>
                        </v-window-item>

                        <v-window-item value="captures">
                            <div style="display: flex; align-items: flex-start; gap: 10px; flex-wrap: wrap; margin-bottom: 12px;">
                                <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                                    <v-chip size="small" :color="capturesValidation.valid ? 'success' : 'error'" variant="tonal">
                                        {{ capturesValidation.valid ? '语法正确' : '语法错误' }}
                                    </v-chip>
                                </div>
                                <div style="display: flex; justify-content: flex-end; align-items: center; flex-wrap: wrap; gap: 8px; min-width: 0; margin-left: auto;">
                                    <v-btn color="primary" variant="tonal" size="small" :loading="saving" :disabled="loading || saving || !capturesValidation.valid" style="border-radius: 8px; min-width: 0;" @click="saveCaptures">
                                        <v-icon start size="16">mdi-content-save</v-icon>
                                        保存
                                    </v-btn>
                                </div>
                            </div>
                            <v-textarea
                                v-model="customCaptures"
                                variant="outlined"
                                density="comfortable"
                                rows="12"
                                no-resize
                                placeholder="纯正则: HBO&#10;命名捕获: (?i)(HBO|Netflix) >> platform&#10;条件替换: (?i)REMUX >> quality => BluRay&#10;自定义分隔符: (HBO|Netflix) >> sources @,&#10;# 注释行"
                                hint="滚动查看完整内容"
                                persistent-hint
                                :disabled="loading"
                                style="font-family: monospace; font-size: 13px;"
                            ></v-textarea>
                            <div v-if="capturesValidation.errors.length" style="margin-top: 8px; padding: 10px 14px; border-radius: 10px; background: rgba(var(--v-theme-error),0.06); border: 1px solid rgba(var(--v-theme-error),0.18);">
                                <div v-for="err in capturesValidation.errors" :key="'cap-err-'+err.line" style="font-size: 13px; line-height: 1.7; color: rgb(var(--v-theme-error));">
                                    第 {{ err.line }} 行: {{ err.error }}
                                </div>
                            </div>
                            <div style="margin-top: 6px;">
                                <v-btn color="primary" variant="tonal" size="small" style="border-radius: 8px;" @click="copyArrow">复制箭头</v-btn>
                            </div>
                        </v-window-item>

                        <!-- 渲染后处理词 -->
                        <v-window-item value="post_render_words">
                            <div style="display: flex; align-items: flex-start; gap: 10px; flex-wrap: wrap; margin-bottom: 12px;">
                                <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                                    <v-chip size="small" :color="postRenderWordsValidation.valid ? 'success' : 'error'" variant="tonal">
                                        {{ postRenderWordsValidation.valid ? '语法正确' : '语法错误' }}
                                    </v-chip>
                                </div>
                                <div style="display: flex; justify-content: flex-end; align-items: center; flex-wrap: wrap; gap: 8px; min-width: 0; margin-left: auto;">
                                    <v-btn color="primary" variant="tonal" size="small" :loading="saving" :disabled="loading || saving || !postRenderWordsValidation.valid" style="border-radius: 8px; min-width: 0;" @click="savePostRenderWords">
                                        <v-icon start size="16">mdi-content-save</v-icon>
                                        保存
                                    </v-btn>
                                </div>
                            </div>
                            <v-textarea
                                v-model="postRenderWords"
                                variant="outlined"
                                density="comfortable"
                                rows="12"
                                no-resize
                                placeholder="一行一个，# 为注释&#10;被替换词 => 替换词（正则替换）&#10;屏蔽词（删除匹配内容）&#10;BluRay Remux => BluRay.REMUX&#10;(?i)\\bremux\\b => REMUX"
                                hint="滚动查看完整内容"
                                persistent-hint
                                :disabled="loading"
                                style="font-family: monospace; font-size: 13px;"
                            ></v-textarea>
                            <div v-if="postRenderWordsValidation.errors.length" style="margin-top: 8px; padding: 10px 14px; border-radius: 10px; background: rgba(var(--v-theme-error),0.06); border: 1px solid rgba(var(--v-theme-error),0.18);">
                                <div v-for="err in postRenderWordsValidation.errors" :key="'pr-err-'+err.line" style="font-size: 13px; line-height: 1.7; color: rgb(var(--v-theme-error));">
                                    第 {{ err.line }} 行: {{ err.error }}
                                </div>
                            </div>
                            <div style="margin-top: 6px;">
                                <v-btn color="primary" variant="tonal" size="small" style="border-radius: 8px;" @click="copyArrow">复制箭头</v-btn>
                            </div>
                        </v-window-item>

                        <!-- 二级分类管理 -->
                        <v-window-item value="category">
                            <div style="display: flex; gap: 8px; justify-content: flex-end; align-items: center; flex-wrap: wrap; margin-bottom: 12px;">
                                <v-btn color="primary" variant="tonal" size="small" :disabled="loading || categorySaving" style="border-radius: 8px; min-width: 0;" @click="resetCategoryRaw">
                                    重置
                                </v-btn>
                                <v-btn color="primary" variant="text" size="small" :loading="categoryEditorLoading" :disabled="loading || categorySaving || categoryEditorSaving" style="border-radius: 8px; min-width: 0;" @click="openCategoryEditor">
                                    <v-icon start size="16">mdi-tune-variant</v-icon>
                                    可视化编辑
                                </v-btn>
                                <v-btn color="primary" variant="tonal" size="small" :loading="categorySaving" :disabled="loading || categorySaving" style="border-radius: 8px; min-width: 0;" @click="saveCategory">
                                    <v-icon start size="16">mdi-content-save</v-icon>
                                    保存
                                </v-btn>
                            </div>
                            <div id="category-ace-editor" style="width: 100%; height: 520px; border-radius: 8px; overflow: hidden; font-size: 14px;"></div>
                        </v-window-item>
                    </v-window>
                    <v-dialog v-model="categoryEditorDialog" max-width="1280" scrollable>
                        <v-card style="width: 100%; max-width: 1220px; margin: 0 auto; border-radius: 16px; overflow: hidden;">
                            <v-card-title class="d-flex align-center" style="padding: 14px 16px; font-size: 17px; font-weight: 600; gap: 10px; flex-wrap: wrap;">
                                <v-icon color="primary" size="22">mdi-tune-variant</v-icon>
                                <span>二级分类可视化编辑</span>
                                <v-chip size="small" variant="tonal" color="primary" style="border-radius: 10px;">保存后会同步回 category.yaml</v-chip>
                                <div style="display: flex; align-items: center; gap: 8px; margin-left: auto;">
                                    <v-btn icon variant="text" size="x-small" :disabled="categoryEditorSaving" @click="closeCategoryEditor">
                                        <v-icon size="20">mdi-close</v-icon>
                                    </v-btn>
                                </div>
                            </v-card-title>
                            <v-divider></v-divider>
                            <v-card-text style="padding: 16px; max-height: 78vh; overflow-y: auto;">
                                <div v-if="categoryEditorLoading" style="display: flex; justify-content: center; padding: 64px 0;">
                                    <v-progress-circular indeterminate color="primary"></v-progress-circular>
                                </div>
                                <div v-else style="display: flex; flex-direction: column; gap: 18px;">
                                    <div style="font-size: 12px; color: rgba(var(--v-theme-on-surface),0.58); line-height: 1.7;">
                                        这里按匹配顺序编辑电影和电视剧分类。上面的分类优先级更高；空规则表示兜底分类；额外字段可填写任意 TMDB 一级字段。
                                    </div>
                                    <v-row style="margin: 0 -8px;">
                                        <v-col v-for="scope in ['movie', 'tv']" :key="'category-scope-' + scope" cols="12" lg="6" style="padding: 8px;">
                                            <div style="display: flex; flex-direction: column; gap: 12px; height: 100%; padding: 14px; border-radius: 14px; background: rgba(var(--v-theme-surface),0.98); border: 1px solid rgba(var(--v-theme-on-surface),0.08);">
                                                <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap;">
                                                    <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap; min-width: 0;">
                                                        <v-icon :icon="getCategoryScopeMeta(scope).icon" color="primary" size="18"></v-icon>
                                                        <div style="font-size: 14px; font-weight: 600; color: rgba(var(--v-theme-on-surface),0.86);">{{ getCategoryScopeMeta(scope).title }}</div>
                                                        <v-chip size="x-small" variant="tonal" color="primary" style="border-radius: 10px;">{{ getCategoryScopeItems(scope).length }} 条</v-chip>
                                                    </div>
                                                    <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-left: auto;">
                                                        <v-btn color="primary" variant="text" size="small" style="border-radius: 8px; min-width: 0;" @click="addCategoryRule(scope)">
                                                            <v-icon start size="16">mdi-plus</v-icon>
                                                            {{ getCategoryScopeMeta(scope).addLabel }}
                                                        </v-btn>
                                                    </div>
                                                </div>
                                                <div v-if="!getCategoryScopeItems(scope).length" style="padding: 26px 14px; border-radius: 12px; text-align: center; background: rgba(var(--v-theme-on-surface),0.025); border: 1px dashed rgba(var(--v-theme-on-surface),0.12); color: rgba(var(--v-theme-on-surface),0.5); font-size: 12px; line-height: 1.7;">
                                                    {{ getCategoryScopeMeta(scope).emptyText }}
                                                </div>
                                                <div v-else style="display: flex; flex-direction: column; gap: 12px;">
                                                    <div v-for="(item, index) in getCategoryScopeItems(scope)" :key="item.id" style="padding: 14px; border-radius: 14px; background: rgba(var(--v-theme-on-surface),0.022); border: 1px solid rgba(var(--v-theme-on-surface),0.08); display: flex; flex-direction: column; gap: 12px;">
                                                        <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap;">
                                                            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap; min-width: 0;">
                                                                <v-chip size="x-small" variant="flat" color="primary" style="border-radius: 10px;">优先级 {{ index + 1 }}</v-chip>
                                                                <v-chip v-if="isCategoryRuleFallback(item)" size="x-small" variant="tonal" color="warning" style="border-radius: 10px;">兜底分类</v-chip>
                                                            </div>
                                                            <div style="display: flex; align-items: center; gap: 4px; flex-wrap: wrap; margin-left: auto;">
                                                                <v-btn icon variant="text" size="x-small" :disabled="index === 0" @click="moveCategoryRule(scope, index, -1)">
                                                                    <v-icon size="18">mdi-arrow-up</v-icon>
                                                                </v-btn>
                                                                <v-btn icon variant="text" size="x-small" :disabled="index === getCategoryScopeItems(scope).length - 1" @click="moveCategoryRule(scope, index, 1)">
                                                                    <v-icon size="18">mdi-arrow-down</v-icon>
                                                                </v-btn>
                                                                <v-btn icon variant="text" size="x-small" color="error" @click="removeCategoryRule(scope, index)">
                                                                    <v-icon size="18">mdi-delete-outline</v-icon>
                                                                </v-btn>
                                                            </div>
                                                        </div>
                                                        <v-text-field
                                                            v-model="item.name"
                                                            variant="outlined"
                                                            density="comfortable"
                                                            label="分类名称 / 目录名称"
                                                            placeholder="例如：动画电影、国产剧、其他剧"
                                                            hide-details="auto"
                                                        ></v-text-field>
                                                        <v-row style="margin: 0 -6px;">
                                                            <v-col v-for="def in getCategoryPresetFields(scope)" :key="item.id + '-' + def.key" cols="12" md="6" style="padding: 6px;">
                                                                <v-combobox
                                                                    v-if="def.type === 'multi'"
                                                                    :model-value="getCategoryKnownFieldValue(item, def.key)"
                                                                    @update:modelValue="setCategoryKnownFieldValue(item, def.key, $event)"
                                                                    :items="def.items"
                                                                    item-title="title"
                                                                    item-value="value"
                                                                    :label="def.label"
                                                                    variant="outlined"
                                                                    density="comfortable"
                                                                    chips
                                                                    closable-chips
                                                                    multiple
                                                                    clearable
                                                                    hide-details="auto"
                                                                    :hint="def.hint"
                                                                    persistent-hint
                                                                ></v-combobox>
                                                                <v-text-field
                                                                    v-else
                                                                    v-model="item.rule[def.key]"
                                                                    :label="def.label"
                                                                    :placeholder="def.placeholder"
                                                                    :hint="def.hint"
                                                                    persistent-hint
                                                                    variant="outlined"
                                                                    density="comfortable"
                                                                    hide-details="auto"
                                                                ></v-text-field>
                                                            </v-col>
                                                        </v-row>
                                                    </div>
                                                </div>
                                            </div>
                                        </v-col>
                                    </v-row>
                                </div>
                            </v-card-text>
                            <v-divider></v-divider>
                            <v-card-actions style="padding: 12px 16px; gap: 8px; justify-content: flex-end; flex-wrap: wrap;">
                                <v-btn variant="tonal" style="border-radius: 8px; min-width: 96px;" :disabled="categoryEditorSaving" @click="closeCategoryEditor">关闭</v-btn>
                                <v-btn color="primary" variant="flat" style="border-radius: 8px; min-width: 112px;" :loading="categoryEditorSaving" @click="saveCategoryEditor">
                                    <v-icon start size="16">mdi-content-save</v-icon>
                                    保存分类
                                </v-btn>
                            </v-card-actions>
                        </v-card>
                    </v-dialog>
                    <v-dialog v-model="organizeNotifyPreviewDialog" max-width="960" scrollable>
                        <v-card style="width: 100%; max-width: 920px; margin: 0 auto; border-radius: 16px; overflow: hidden;">
                            <v-card-title style="padding: 14px 16px; font-size: 17px; font-weight: 600;">
                                <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap;">
                                    <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap; min-width: 0;">
                                        <v-icon color="primary" size="22">mdi-eye-outline</v-icon>
                                        <span>浏览模板</span>
                                    </div>
                                    <div style="display: flex; align-items: center; gap: 8px; margin-left: auto;">
                                        <v-btn icon variant="text" size="x-small" @click="organizeNotifyPreviewDialog = false">
                                            <v-icon size="20">mdi-close</v-icon>
                                        </v-btn>
                                    </div>
                                </div>
                            </v-card-title>
                            <v-divider></v-divider>
                            <v-card-text style="padding: 16px; max-height: 70vh; overflow-y: auto;">
                                <div style="font-size: 12px; color: rgba(var(--v-theme-on-surface),0.58); line-height: 1.7; margin-bottom: 12px;">
                                    展示当前整理结果 Telegram 通知模板在电影和电视剧场景下的渲染结果，查看时不会影响当前编辑内容。
                                </div>
                                <v-row style="margin: 0 -6px;">
                                    <v-col cols="12" md="6" style="padding: 6px;">
                                        <div style="padding: 14px; border-radius: 12px; background: rgba(61,111,213,0.08); border: 1px solid rgba(61,111,213,0.14); height: 100%;">
                                            <div style="display: flex; align-items: center; gap: 6px; font-size: 12px; color: rgba(var(--v-theme-on-surface),0.65); margin-bottom: 8px;">
                                                <v-icon size="14" color="primary">mdi-movie-open-outline</v-icon>
                                                电影示例预览
                                            </div>
                                            <div style="font-family: monospace; font-size: 13px; line-height: 1.7; white-space: pre-wrap; word-break: break-word; min-height: 120px;">
                                                {{ getOrganizeNotifyInspection().movie_preview || '当前模板未通过校验，暂无电影示例预览' }}
                                            </div>
                                        </div>
                                    </v-col>
                                    <v-col cols="12" md="6" style="padding: 6px;">
                                        <div style="padding: 14px; border-radius: 12px; background: rgba(61,111,213,0.08); border: 1px solid rgba(61,111,213,0.14); height: 100%;">
                                            <div style="display: flex; align-items: center; gap: 6px; font-size: 12px; color: rgba(var(--v-theme-on-surface),0.65); margin-bottom: 8px;">
                                                <v-icon size="14" color="primary">mdi-television-classic</v-icon>
                                                电视剧示例预览
                                            </div>
                                            <div style="font-family: monospace; font-size: 13px; line-height: 1.7; white-space: pre-wrap; word-break: break-word; min-height: 120px;">
                                                {{ getOrganizeNotifyInspection().tv_preview || '当前模板未通过校验，暂无电视剧示例预览' }}
                                            </div>
                                        </div>
                                    </v-col>
                                </v-row>
                            </v-card-text>
                            <v-divider></v-divider>
                            <v-card-actions style="padding: 12px 16px; gap: 8px; justify-content: flex-end; flex-wrap: wrap;">
                                <v-btn variant="tonal" style="border-radius: 8px; min-width: 96px;" @click="organizeNotifyPreviewDialog = false">关闭</v-btn>
                            </v-card-actions>
                        </v-card>
                    </v-dialog>
                    <v-dialog v-model="organizeNotifyFieldDialog" max-width="980" scrollable>
                        <v-card style="width: 100%; max-width: 940px; margin: 0 auto; border-radius: 16px; overflow: hidden;">
                            <v-card-title style="padding: 14px 16px; font-size: 17px; font-weight: 600;">
                                <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap;">
                                    <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap; min-width: 0;">
                                        <v-icon color="primary" size="22">mdi-shape-outline</v-icon>
                                        <span>字段说明</span>
                                    </div>
                                    <div style="display: flex; align-items: center; gap: 8px; margin-left: auto;">
                                        <v-btn icon variant="text" size="x-small" @click="organizeNotifyFieldDialog = false">
                                            <v-icon size="20">mdi-close</v-icon>
                                        </v-btn>
                                    </div>
                                </div>
                            </v-card-title>
                            <v-divider></v-divider>
                            <v-card-text style="padding: 16px; max-height: 70vh; overflow-y: auto;">
                                <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; flex-wrap: wrap; margin-bottom: 14px;">
                                    <div style="font-size: 12px; color: rgba(var(--v-theme-on-surface),0.58); line-height: 1.7; max-width: 640px;">
                                        下方列出成功类整理通知可用字段，可直接复制 <code>snippet</code> 到模板源码区使用。
                                    </div>
                                    <v-chip size="small" color="primary" variant="tonal" style="border-radius: 10px;">
                                        {{ getNotifyFieldCount() }} 个字段
                                    </v-chip>
                                </div>
                                <div style="display: flex; flex-direction: column; gap: 14px;">
                                    <div v-for="section in notifyFieldCatalog" :key="'notify-dialog-section-' + section.key">
                                        <div style="font-size: 12px; font-weight: 600; color: rgba(var(--v-theme-on-surface),0.68); margin-bottom: 8px;">{{ section.title }}</div>
                                        <v-row style="margin: 0 -6px;">
                                            <v-col
                                                v-for="item in section.items || []"
                                                :key="'notify-dialog-field-' + item.key"
                                                cols="12"
                                                sm="6"
                                                lg="4"
                                                style="padding: 6px;"
                                            >
                                                <div style="display: flex; flex-direction: column; gap: 6px; height: 100%; padding: 10px 12px; border-radius: 12px; background: rgba(var(--v-theme-surface),0.92); border: 1px solid rgba(var(--v-theme-on-surface),0.06);">
                                                    <v-chip size="small" variant="flat" :style="getNotifyFieldCardStyle(item)">
                                                        {{ item.snippet }}
                                                    </v-chip>
                                                    <div style="font-size: 12px; font-weight: 600; color: rgba(var(--v-theme-on-surface),0.78);">{{ item.label }}</div>
                                                    <div style="font-size: 11px; line-height: 1.6; color: rgba(var(--v-theme-on-surface),0.56); word-break: break-word;">
                                                        {{ item.description }}
                                                    </div>
                                                </div>
                                            </v-col>
                                        </v-row>
                                    </div>
                                </div>
                            </v-card-text>
                            <v-divider></v-divider>
                            <v-card-actions style="padding: 12px 16px; gap: 8px; justify-content: flex-end; flex-wrap: wrap;">
                                <v-btn variant="tonal" style="border-radius: 8px; min-width: 96px;" @click="organizeNotifyFieldDialog = false">关闭</v-btn>
                            </v-card-actions>
                        </v-card>
                    </v-dialog>
                </v-card-text>
            </v-card>
        </div>
    `
};
