package com.example.data.local.dao

import androidx.room.*
import com.example.data.local.entity.LlmModelEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface LlmModelDao {
    @Query("SELECT * FROM llm_models")
    fun getAllModels(): Flow<List<LlmModelEntity>>

    @Query("SELECT * FROM llm_models WHERE isSelected = 1 LIMIT 1")
    fun getSelectedModel(): Flow<LlmModelEntity?>

    @Query("SELECT * FROM llm_models WHERE isSelected = 1 LIMIT 1")
    suspend fun getSelectedModelOnce(): LlmModelEntity?

    @Query("SELECT * FROM llm_models WHERE id = :id")
    suspend fun getModelByIdOnce(id: String): LlmModelEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertModel(model: LlmModelEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertModels(models: List<LlmModelEntity>)

    @Query("UPDATE llm_models SET isSelected = 0")
    suspend fun clearSelection()

    @Query("UPDATE llm_models SET isSelected = 1 WHERE id = :id")
    suspend fun selectModel(id: String)

    @Update
    suspend fun updateModel(model: LlmModelEntity)
}
