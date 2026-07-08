const prisma = require('../config/database');
const ApiError = require('../utils/ApiError');

class SlaService {
  /**
   * Retrieves the SLA configuration for a given tenant.
   * If it doesn't exist, returns default values.
   */
  async getSlaConfig(tenantId) {
    if (!tenantId) throw new ApiError(400, 'Tenant ID is required', 'VALIDATION_ERROR');

    const config = await prisma.slaConfig.findUnique({
      where: { tenantId }
    });

    if (!config) {
      return {
        firstResponseMins: 15,
        resolutionMins: 60
      };
    }

    return config;
  }

  /**
   * Updates or creates the SLA configuration for a given tenant.
   */
  async updateSlaConfig(tenantId, data) {
    if (!tenantId) throw new ApiError(400, 'Tenant ID is required', 'VALIDATION_ERROR');

    if (!data || typeof data !== 'object' || Object.keys(data).length === 0) {
      throw new ApiError(400, 'Payload is empty or invalid', 'VALIDATION_ERROR');
    }

    const { firstResponseMins, resolutionMins } = data;

    if (firstResponseMins !== undefined && (!Number.isInteger(firstResponseMins) || firstResponseMins <= 0 || firstResponseMins > 10080)) {
      throw new ApiError(400, 'firstResponseMins must be an integer between 1 and 10080', 'VALIDATION_ERROR');
    }

    if (resolutionMins !== undefined && (!Number.isInteger(resolutionMins) || resolutionMins <= 0 || resolutionMins > 10080)) {
      throw new ApiError(400, 'resolutionMins must be an integer between 1 and 10080', 'VALIDATION_ERROR');
    }

    if (firstResponseMins !== undefined && resolutionMins !== undefined) {
      if (firstResponseMins > resolutionMins) {
        throw new ApiError(400, 'firstResponseMins cannot be greater than resolutionMins', 'VALIDATION_ERROR');
      }
    }

    const config = await prisma.slaConfig.upsert({
      where: { tenantId },
      update: {
        ...(firstResponseMins !== undefined && { firstResponseMins }),
        ...(resolutionMins !== undefined && { resolutionMins })
      },
      create: {
        tenantId,
        firstResponseMins: firstResponseMins || 15,
        resolutionMins: resolutionMins || 60
      }
    });

    return config;
  }
}

module.exports = new SlaService();
