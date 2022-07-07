using Azure.Communication.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using System.Threading.Tasks;

namespace acs_kitchen_sink.Controllers
{
    [ApiController]
    [Route("Identity")]
    public class IdentityController : ControllerBase
    {
        private readonly CommunicationIdentityClient _client;
        private readonly ILogger<IdentityController> _logger;

        public IdentityController(CommunicationIdentityClient client, ILogger<IdentityController> logger)
        {
            _client = client;
            _logger = logger;
        }

        [HttpGet]
        public async Task<ActionResult<CommunicationUserIdentifierAndToken>> GetIdentityAsync()
        {
            var identityResponse = await _client.CreateUserAndTokenAsync(scopes: new[] {
                CommunicationTokenScope.VoIP,
                CommunicationTokenScope.Chat
            });

            return Ok(identityResponse);
        }
    }
}
