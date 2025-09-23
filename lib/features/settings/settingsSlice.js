import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import axios from 'axios'

export const fetchSettings = createAsyncThunk('settings/fetchSettings',
    async ({ getToken }, thunkAPI) => {
        try {
            const token = await getToken()
            const { data } = await axios.get('/api/admin/settings', { headers: { Authorization: `Bearer ${token}` } })
            return data.settings
        } catch (error) {
            return thunkAPI.rejectWithValue(error.response?.data?.error || error.message)
        }
    }
)

export const fetchPublicSettings = createAsyncThunk('settings/fetchPublicSettings',
    async (_, thunkAPI) => {
        try {
            const { data } = await axios.get('/api/settings/public')
            return data.settings
        } catch (error) {
            return thunkAPI.rejectWithValue(error.response?.data?.error || error.message)
        }
    }
)

export const updateSettings = createAsyncThunk('settings/updateSettings',
    async ({ updates, getToken }, thunkAPI) => {
        try {
            console.log('DEBUG: Redux updateSettings called with:', updates)
            const token = await getToken()
            const { data } = await axios.patch('/api/admin/settings', updates, { headers: { Authorization: `Bearer ${token}` } })
            console.log('DEBUG: Redux updateSettings success:', data.settings)
            return data.settings
        } catch (error) {
            console.error('DEBUG: Redux updateSettings error:', error.response?.data || error.message)
            return thunkAPI.rejectWithValue(error.response?.data?.error || error.message)
        }
    }
)

const settingsSlice = createSlice({
    name: 'settings',
    initialState: {
        data: {},
        publicData: {},
        loading: false,
        error: null,
    },
    reducers: {
        clearError: (state) => {
            state.error = null
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchSettings.pending, (state) => {
                state.loading = true
                state.error = null
            })
            .addCase(fetchSettings.fulfilled, (state, action) => {
                state.loading = false
                state.data = action.payload
            })
            .addCase(fetchSettings.rejected, (state, action) => {
                state.loading = false
                state.error = action.payload
            })
            .addCase(updateSettings.pending, (state) => {
                state.loading = true
                state.error = null
            })
            .addCase(updateSettings.fulfilled, (state, action) => {
                state.loading = false
                state.data = action.payload
            })
            .addCase(updateSettings.rejected, (state, action) => {
                state.loading = false
                state.error = action.payload
            })
            .addCase(fetchPublicSettings.pending, (state) => {
                state.loading = true
                state.error = null
            })
            .addCase(fetchPublicSettings.fulfilled, (state, action) => {
                state.loading = false
                state.publicData = action.payload
            })
            .addCase(fetchPublicSettings.rejected, (state, action) => {
                state.loading = false
                state.error = action.payload
            })
    }
})

export const { clearError } = settingsSlice.actions

export default settingsSlice.reducer