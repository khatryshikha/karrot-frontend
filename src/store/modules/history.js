import historyAPI from '@/services/api/history'
import { indexById } from '@/store/helpers'
import i18n from '@/i18n'

export const types = {
  REQUEST: 'Request',
  RECEIVE: 'Receive',
  RECEIVE_ERROR: 'Receive Error',

  CLEAR: 'Clear',
}

export const state = {
  entries: {},
  idList: [],
  cursor: null,
  receiveStatus: {
    isWaiting: false,
    error: null,
    success: true,
  },
}

export const getters = {
  get: (state, getters, rootState, rootGetters) => id => {
    return getters.enrich(state.entries[id])
  },
  all: (state, getters, rootState, rootGetters) => {
    return state.idList.map(getters.get)
  },
  receiveStatus: (state, getters, rootState, rootGetters) => {
    return state.receiveStatus
  },
  canLoadMore: (state, getters, rootState, rootGetters) => {
    return typeof state.cursor === 'string'
  },
  enrich: (state, getters, rootState, rootGetters) => entry => {
    const store = rootGetters['stores/get'](entry.store)
    const msgValues = store ? { storeName: store.name, name: store.name } : {}
    return {
      ...entry,
      users: entry.users.map(rootGetters['users/get']),
      group: rootGetters['groups/get'](entry.group),
      store: store,
      message: i18n.t(`HISTORY.${entry.typus}`, msgValues),
      // TODO enrich payload
    }
  },
}

export const actions = {
  async fetchForActiveGroup ({ dispatch, commit, rootGetters }) {
    dispatch('clear')
    commit(types.REQUEST)
    const groupId = rootGetters['groups/activeGroupId']
    let data
    try {
      data = await historyAPI.list({ group: groupId })
    }
    catch (error) {
      commit(types.RECEIVE_ERROR, { error })
      throw error
    }
    commit(types.RECEIVE, { entries: data.results, cursor: data.next })
  },

  async fetchMore ({ state, commit }) {
    if (!state.cursor) {
      return
    }
    commit(types.REQUEST)

    try {
      const data = await historyAPI.listMore(state.cursor)
      commit(types.RECEIVE, { entries: data.results, cursor: data.next })
    }
    catch (error) {
      commit(types.RECEIVE_ERROR, { error })
    }
  },

  clear ({ commit }) {
    commit(types.CLEAR)
  },
}

export const mutations = {
  [types.REQUEST] (state) {
    state.receiveStatus = {
      isWaiting: true,
      error: null,
      success: false,
    }
  },
  [types.RECEIVE] (state, { entries, cursor }) {
    state.receiveStatus = {
      isWaiting: false,
      error: null,
      success: true,
    }
    state.entries = {
      ...state.entries,
      ...indexById(entries),
    }
    state.idList.push(...entries.map(e => e.id)) // TODO take care of duplicates
    state.cursor = cursor
  },
  [types.RECEIVE_ERROR] (state, { error }) {
    state.receiveStatus = {
      isWaiting: false,
      error,
      success: false,
    }
  },

  [types.CLEAR] (state) {
    state = {
      entries: {},
      idList: [],
      cursor: null,
      receiveStatus: {
        isWaiting: false,
        error: null,
        success: true,
      },
    }
  },
}
