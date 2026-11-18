// 状态管理：useReducer + undo/redo。state.present 是当前卡牌工程。

export const initialEditorState = (card, { canUndo = false, canRedo = false } = {}) => ({
  card,
  past: [],
  future: [],
  canUndo,
  canRedo,
});

function clone(x) {
  return JSON.parse(JSON.stringify(x));
}

export function editorReducer(state, action) {
  switch (action.type) {
    case "commit": {
      // 用 action.next 覆盖当前卡牌，并把旧版本压入 past
      const next = action.next;
      return {
        card: next,
        past: [...state.past.slice(-49), clone(state.card)],
        future: [],
        canUndo: true,
        canRedo: false,
      };
    }
    case "set": {
      // 一次性写入新卡牌，不 push 历史（用于高频拖动）
      // 兼容两种形式：action.updater(card) 或直接给 action.card
      const card = action.updater
        ? action.updater(clone(state.card))
        : action.card;
      if (!card) return state;
      return { ...state, card };
    }
    case "pushHistory": {
      // 把「拖动前」的快照压入历史，用于撤销一次拖动
      if (!action.prev) return state;
      return {
        ...state,
        past: [...state.past.slice(-49), clone(action.prev)],
        future: [],
        canUndo: true,
        canRedo: false,
      };
    }
    case "undo": {
      if (!state.past.length) return state;
      const prev = state.past[state.past.length - 1];
      return {
        card: prev,
        past: state.past.slice(0, -1),
        future: [clone(state.card), ...state.future],
        canUndo: state.past.length > 1,
        canRedo: true,
      };
    }
    case "redo": {
      if (!state.future.length) return state;
      const next = state.future[0];
      return {
        card: next,
        past: [...state.past, clone(state.card)],
        future: state.future.slice(1),
        canUndo: true,
        canRedo: state.future.length > 1,
      };
    }
    case "reset": {
      return {
        card: action.card,
        past: [],
        future: [],
        canUndo: false,
        canRedo: false,
      };
    }
    case "replaceState": {
      return action.state;
    }
    default:
      return state;
  }
}